import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FortCombinedScanBody, FortScanBody, GolbatStatus, PokemonScanBody } from "./types";

vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({
		golbat: { url: "http://golbat.test/", auth: "Bearer test", secret: "test-secret" }
	})
}));
vi.mock("@/lib/utils/logger", () => ({
	getLogger: () => ({ debug: vi.fn(), error: vi.fn() })
}));

const mockFetch = vi.fn<typeof fetch>();
let http: typeof import("./http");

const status: GolbatStatus = {
	features: { fort_in_memory: true },
	limits: { max_fort_results: 9000 },
	filters: { updated_after: true }
};
const scanBody = {
	min: { latitude: 51.5, longitude: -0.2 },
	max: { latitude: 51.6, longitude: -0.1 },
	limit: 11,
	filters: []
};
const unsupportedProblem = {
	title: "Unprocessable Entity",
	status: 422,
	errors: [{ location: "body.updated_after", message: "unexpected property", value: 99 }]
};

beforeEach(async () => {
	vi.resetModules();
	mockFetch.mockReset();
	vi.stubGlobal("fetch", mockFetch);
	http = await import("./http");
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	expect(http.golbatInFlight.count).toBe(0);
});

describe("Golbat updated_after discovery", () => {
	it("defaults to unsupported and caches an explicit true from status", async () => {
		expect(http.getUpdatedAfter(100)).toBeUndefined();
		expect(mockFetch).not.toHaveBeenCalled();
		mockFetch.mockResolvedValueOnce(Response.json(status));

		await expect(http.fetchGolbatStatus()).resolves.toEqual(status);
		expect(http.getUpdatedAfter(100)).toBe(99);
		expect(http.getUpdatedAfter(101)).toBe(100);
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch.mock.calls[0][0].toString()).toBe("http://golbat.test/api/status");
		expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: "GET", body: undefined });
	});

	it.each([
		["absent filters", undefined],
		["absent flag", {}],
		["false", { updated_after: false }],
		["truthy string", { updated_after: "true" }],
		["truthy number", { updated_after: 1 }],
		["null filters", null]
	])("clears cached support on %s", async (_name, filters) => {
		mockFetch
			.mockResolvedValueOnce(Response.json(status))
			.mockResolvedValueOnce(Response.json({ ...status, filters }));
		await http.fetchGolbatStatus();
		expect(http.getUpdatedAfter(100)).toBe(99);

		await http.fetchGolbatStatus();
		expect(http.getUpdatedAfter(100)).toBeUndefined();
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it.each([404, 503])("clears cached support on HTTP %s", async (code) => {
		mockFetch
			.mockResolvedValueOnce(Response.json(status))
			.mockResolvedValueOnce(Response.json(status, { status: code }));
		await http.fetchGolbatStatus();

		await expect(http.fetchGolbatStatus()).resolves.toBeUndefined();
		expect(http.getUpdatedAfter(100)).toBeUndefined();
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it("clears cached support when status is unavailable", async () => {
		mockFetch
			.mockResolvedValueOnce(Response.json(status))
			.mockResolvedValueOnce(Response.json(null));
		await http.fetchGolbatStatus();

		await expect(http.fetchGolbatStatus()).resolves.toBeNull();
		expect(http.getUpdatedAfter(100)).toBeUndefined();
	});

	it("clears cached support and propagates network failures", async () => {
		const error = new Error("Golbat unavailable");
		mockFetch.mockResolvedValueOnce(Response.json(status)).mockRejectedValueOnce(error);
		await http.fetchGolbatStatus();

		await expect(http.fetchGolbatStatus()).rejects.toBe(error);
		expect(http.getUpdatedAfter(100)).toBeUndefined();
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it("clears cached support and propagates malformed status JSON", async () => {
		mockFetch
			.mockResolvedValueOnce(Response.json(status))
			.mockResolvedValueOnce(new Response("not JSON"));
		await http.fetchGolbatStatus();

		await expect(http.fetchGolbatStatus()).rejects.toBeInstanceOf(SyntaxError);
		expect(http.getUpdatedAfter(100)).toBeUndefined();
	});
});

describe("Golbat updated_after cutoff", () => {
	beforeEach(async () => {
		mockFetch.mockResolvedValueOnce(Response.json(status));
		await http.fetchGolbatStatus();
	});

	it.each([
		[2, 1],
		[1 + Number.EPSILON, 1],
		[100, 99],
		[100.01, 100],
		[100.999, 100],
		[1_700_000_000, 1_699_999_999],
		[Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1]
	])("conservatively maps %s to %s", (since, expected) => {
		expect(http.getUpdatedAfter(since)).toBe(expected);
	});

	it.each([
		undefined,
		null,
		"100",
		true,
		{},
		NaN,
		Infinity,
		-Infinity,
		0,
		-1,
		-0.5,
		Number.MIN_VALUE,
		0.5,
		1,
		Number.MAX_SAFE_INTEGER + 1,
		Number.MAX_SAFE_INTEGER + 2,
		Number.MAX_VALUE
	])("omits invalid or unusable cutoff %s", (since) => {
		expect(http.getUpdatedAfter(since as number | undefined)).toBeUndefined();
	});
});

describe("Golbat updated_after serialization", () => {
	it.each([
		["getMultiplePokemon", "api/pokemon/v3/scan"],
		["scanGyms", "api/gym/scan"],
		["scanPokestops", "api/pokestop/scan"],
		["scanStations", "api/station/scan"]
	] as const)("serializes the cutoff in %s", async (scan, path) => {
		mockFetch.mockResolvedValueOnce(Response.json(status)).mockResolvedValueOnce(Response.json({}));
		await http.fetchGolbatStatus();
		const body: PokemonScanBody & FortScanBody = {
			...scanBody,
			updated_after: http.getUpdatedAfter(100)
		};

		await http[scan](body);

		expect(mockFetch).toHaveBeenCalledTimes(2);
		expect(mockFetch.mock.calls[1][0].toString()).toBe(`http://golbat.test/${path}`);
		expect(mockFetch.mock.calls[1][1]).toMatchObject({
			method: "POST",
			body: JSON.stringify({ ...scanBody, updated_after: 99 }),
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer test",
				"X-Golbat-Secret": "test-secret"
			}
		});
	});

	it("preserves combined fort groups and nested limits", async () => {
		mockFetch.mockResolvedValueOnce(Response.json(status)).mockResolvedValueOnce(Response.json({}));
		await http.fetchGolbatStatus();
		const body: FortCombinedScanBody = {
			min: scanBody.min,
			max: scanBody.max,
			limit: 36,
			updated_after: http.getUpdatedAfter(100),
			with_incidents: true,
			gyms: { filters: [{ raid_level: [5] }], limit: 11 },
			pokestops: { filters: [{ lure_id: [501] }], limit: 12 },
			stations: { filters: [{ station_active: true }], limit: 13 }
		};

		await http.scanForts(body);

		expect(mockFetch.mock.calls[1][0].toString()).toBe("http://golbat.test/api/fort/scan");
		expect(JSON.parse(mockFetch.mock.calls[1][1]?.body as string)).toEqual({
			...body,
			updated_after: 99
		});
	});

	it("omits the field while support is unknown", async () => {
		mockFetch.mockResolvedValueOnce(Response.json({}));
		await http.getMultiplePokemon({ ...scanBody, updated_after: http.getUpdatedAfter(100) });

		expect(JSON.parse(mockFetch.mock.calls[0][1]?.body as string)).toEqual(scanBody);
	});
});

describe("Golbat mixed-version HTTP fallback", () => {
	beforeEach(async () => {
		mockFetch.mockResolvedValueOnce(Response.json(status));
		await http.fetchGolbatStatus();
		mockFetch.mockReset();
	});

	it("does not grant the retry a fresh deadline when the original timeout expires", async () => {
		const timeout = new AbortController();
		const error = new DOMException("request timed out", "TimeoutError");
		const timer = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
		mockFetch
			.mockImplementationOnce(async () => {
				timeout.abort(error);
				return Response.json(unsupportedProblem, { status: 422 });
			})
			.mockImplementationOnce(async (_url, init) => {
				init?.signal?.throwIfAborted();
				return Response.json({});
			});
		await expect(http.getMultiplePokemon({ ...scanBody, updated_after: 99 })).rejects.toBe(error);
		expect(timer).toHaveBeenCalledExactlyOnceWith(10_000);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it("retries the explicit unsupported property once without mutating the input", async () => {
		const body = Object.freeze({ ...scanBody, updated_after: 99 });
		const result = { pokemon: [], examined: 0, skipped: 0, total: 0 };
		mockFetch
			.mockImplementationOnce(async () => {
				expect(http.golbatInFlight.count).toBe(1);
				return Response.json(unsupportedProblem, {
					status: 422,
					headers: { "Content-Type": "application/problem+json" }
				});
			})
			.mockImplementationOnce(async () => {
				expect(http.getUpdatedAfter(100)).toBeUndefined();
				expect(http.golbatInFlight.count).toBe(1);
				return Response.json(result);
			});

		await expect(http.getMultiplePokemon(body)).resolves.toEqual(result);

		expect(mockFetch).toHaveBeenCalledTimes(2);
		expect(mockFetch.mock.calls[0][1]?.body).toBe(JSON.stringify(body));
		expect(mockFetch.mock.calls[1][0]).toEqual(mockFetch.mock.calls[0][0]);
		expect(mockFetch.mock.calls[1][1]?.signal).toBe(mockFetch.mock.calls[0][1]?.signal);
		expect(mockFetch.mock.calls[1][1]).toEqual({
			...mockFetch.mock.calls[0][1],
			body: JSON.stringify(scanBody),
			signal: expect.any(AbortSignal)
		});
		expect(body).toEqual({ ...scanBody, updated_after: 99 });
		expect(http.getUpdatedAfter(100)).toBeUndefined();

		mockFetch.mockResolvedValueOnce(Response.json(status));
		await http.fetchGolbatStatus();
		expect(http.getUpdatedAfter(100)).toBe(99);
	});

	it.each([
		["same error", 422, unsupportedProblem],
		[
			"different validation error",
			422,
			{ errors: [{ location: "body.limit", message: "invalid" }] }
		],
		["server error", 503, {}]
	] as const)("does not retry again after a %s", async (_name, code, problem) => {
		mockFetch
			.mockResolvedValueOnce(Response.json(unsupportedProblem, { status: 422 }))
			.mockResolvedValueOnce(Response.json(problem, { status: code }));

		await expect(
			http.getMultiplePokemon({ ...scanBody, updated_after: 99 })
		).resolves.toBeUndefined();

		expect(mockFetch).toHaveBeenCalledTimes(2);
		expect(JSON.parse(mockFetch.mock.calls[1][1]?.body as string)).toEqual(scanBody);
		expect(http.getUpdatedAfter(100)).toBeUndefined();
	});

	it("propagates a network error on retry", async () => {
		const error = new Error("Retry failed");
		mockFetch
			.mockResolvedValueOnce(Response.json(unsupportedProblem, { status: 422 }))
			.mockRejectedValueOnce(error);

		await expect(http.getMultiplePokemon({ ...scanBody, updated_after: 99 })).rejects.toBe(error);

		expect(mockFetch).toHaveBeenCalledTimes(2);
		expect(http.getUpdatedAfter(100)).toBeUndefined();
	});

	it.each([
		["same error with HTTP 400", 400, JSON.stringify(unsupportedProblem)],
		["same error with HTTP 500", 500, JSON.stringify(unsupportedProblem)],
		["malformed JSON", 422, "not JSON"],
		["null problem", 422, "null"],
		["missing errors", 422, JSON.stringify({ detail: "body.updated_after: unexpected property" })],
		["non-array errors", 422, JSON.stringify({ errors: unsupportedProblem.errors[0] })],
		["malformed errors", 422, JSON.stringify({ errors: [null, {}, "unexpected property"] })],
		[
			"different location",
			422,
			JSON.stringify({ errors: [{ location: "body.gyms.limit", message: "unexpected property" }] })
		],
		[
			"different message",
			422,
			JSON.stringify({ errors: [{ location: "body.updated_after", message: "must be positive" }] })
		],
		[
			"location and message on different errors",
			422,
			JSON.stringify({
				errors: [
					{ location: "body.updated_after", message: "must be positive" },
					{ location: "body.limit", message: "unexpected property" }
				]
			})
		]
	] as const)("does not retry or disable support on %s", async (_name, code, text) => {
		mockFetch.mockResolvedValueOnce(new Response(text, { status: code }));

		await expect(
			http.getMultiplePokemon({ ...scanBody, updated_after: 99 })
		).resolves.toBeUndefined();

		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(http.getUpdatedAfter(100)).toBe(99);
	});

	it("does not retry when the serialized request has no updated_after", async () => {
		mockFetch.mockResolvedValueOnce(Response.json(unsupportedProblem, { status: 422 }));

		await expect(
			http.getMultiplePokemon({ ...scanBody, updated_after: undefined })
		).resolves.toBeUndefined();

		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(http.getUpdatedAfter(100)).toBe(99);
	});

	it("does not retry GET requests without a body", async () => {
		mockFetch.mockResolvedValueOnce(Response.json(unsupportedProblem, { status: 422 }));

		await expect(http.getSinglePokemon("1")).resolves.toBeUndefined();

		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(http.getUpdatedAfter(100)).toBe(99);
	});
});
