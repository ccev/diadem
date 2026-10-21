import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import {
	admitType,
	refundDenied,
	resolveTypeRequest,
	settleTypeRequest
} from "@/lib/server/api/mapObjectRequest";
import { rateLimitConsume, rateLimitReward } from "@/lib/server/api/rateLimit";
import { hasAnyFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { combinedForts } from "@/lib/server/queryMapObjects/combinedForts";
import {
	queryMapObjects,
	querySingleMapObject
} from "@/lib/server/queryMapObjects/queryMapObjects";
import { CpuWorkerError } from "@/lib/server/workers/pool";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { featureFamily, Features } from "@/lib/utils/features";
import { POST as postSingle } from "@/routes/api/[queryMapObject=mapObject]/+server";
import { GET as getSingle } from "@/routes/api/[queryMapObject=mapObject]/[id]/+server";
import { POST as postForts } from "@/routes/api/forts/+server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/api/mapObjectRequest", () => ({
	admitType: vi.fn(),
	isValidBounds: vi.fn(() => true),
	refundDenied: vi.fn(),
	requestSince: vi.fn((data) => data.since),
	resolveTypeRequest: vi.fn(),
	settleTypeRequest: vi.fn()
}));
vi.mock("@/lib/server/api/rateLimit", () => ({
	rateLimitReward: vi.fn(),
	rateLimitConsume: vi.fn()
}));
vi.mock("@/lib/server/auth/checkIfAuthed", () => ({ hasAnyFeatureAnywhereServer: vi.fn() }));
vi.mock("@/lib/server/queryMapObjects/queryMapObjects", () => ({
	queryMapObjects: vi.fn(),
	querySingleMapObject: vi.fn()
}));
vi.mock("@/lib/server/queryMapObjects/combinedForts", () => ({ combinedForts: vi.fn() }));

const bounds = { minLat: 0, minLon: 0, maxLat: 1, maxLon: 1 };
const locals = {
	user: { id: "u1" },
	perms: { everywhere: [Features.ALL], areas: [] }
} as unknown as App.Locals;
const requestLimit = 10_000;
const totalLimit = 20_000;

function requestEvent(path: string, data: unknown) {
	return {
		request: new Request(`http://localhost/api/${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data)
		}),
		locals,
		params: { queryMapObject: path },
		getClientAddress: () => "127.0.0.1"
	};
}

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(admitType).mockResolvedValue({ status: 200, requestLimit, totalLimit });
	vi.mocked(settleTypeRequest).mockResolvedValue({ charge: 1, remainingPoints: 7 });
});

describe("single map object POST", () => {
	it.each(["busy", "too-large", "timeout", "aborted", "unavailable", "failed"] as const)(
		"refunds encryption-stage %s failures and returns 503 without result data",
		async (code) => {
			const context = new FeaturePermissionContext(locals.perms, [Features.POKEMON]);
			vi.mocked(resolveTypeRequest).mockResolvedValue({
				status: 200,
				filter: undefined,
				permitted: { bounds, polygon: null },
				context,
				filterCached: "1"
			});
			vi.mocked(queryMapObjects).mockRejectedValue(new CpuWorkerError(code));
			const event = requestEvent(MapObjectType.POKEMON, bounds);
			const response = await postSingle(event as Parameters<typeof postSingle>[0]);
			expect(response.status).toBe(503);
			expect(await response.json()).toEqual({ data: [] });
			expect(response.headers.get("X-Filter-Cached")).toBe("1");
			expect(queryMapObjects).toHaveBeenCalledExactlyOnceWith(
				MapObjectType.POKEMON,
				bounds,
				undefined,
				null,
				undefined,
				requestLimit,
				context,
				event.request.signal
			);
			expect(rateLimitReward).toHaveBeenCalledExactlyOnceWith(
				"u1",
				requestLimit,
				MapObjectType.POKEMON
			);
			expect(settleTypeRequest).not.toHaveBeenCalled();
			expect(refundDenied).not.toHaveBeenCalled();
		}
	);
	it.each([401, 409, 503] as const)(
		"responds with resolved status %s without querying or refunding again",
		async (status) => {
			vi.mocked(resolveTypeRequest).mockResolvedValue({ status });
			const event = requestEvent(MapObjectType.GYM, bounds);
			const response = await postSingle(event as Parameters<typeof postSingle>[0]);

			expect(response.status).toBe(status);
			expect(await response.json()).toEqual({ data: [] });
			expect(resolveTypeRequest).toHaveBeenCalledExactlyOnceWith(
				MapObjectType.GYM,
				locals,
				"u1",
				requestLimit,
				bounds,
				bounds,
				event.request.signal
			);
			expect(vi.mocked(resolveTypeRequest).mock.calls[0][6]).toBe(event.request.signal);
			expect(queryMapObjects).not.toHaveBeenCalled();
			expect(settleTypeRequest).not.toHaveBeenCalled();
			expect(rateLimitReward).not.toHaveBeenCalled();
			expect(refundDenied).not.toHaveBeenCalled();
		}
	);

	it("still throws for resolved status 400 without querying or refunding again", async () => {
		vi.mocked(resolveTypeRequest).mockResolvedValue({ status: 400 });
		const event = requestEvent(MapObjectType.GYM, bounds);
		await expect(postSingle(event as Parameters<typeof postSingle>[0])).rejects.toMatchObject({
			status: 400
		});
		expect(resolveTypeRequest).toHaveBeenCalledTimes(1);
		expect(queryMapObjects).not.toHaveBeenCalled();
		expect(settleTypeRequest).not.toHaveBeenCalled();
		expect(rateLimitReward).not.toHaveBeenCalled();
		expect(refundDenied).not.toHaveBeenCalled();
	});

	it("still throws admission status 401 before resolving or querying", async () => {
		vi.mocked(admitType).mockResolvedValue({ status: 401 });
		const event = requestEvent(MapObjectType.GYM, bounds);
		await expect(postSingle(event as Parameters<typeof postSingle>[0])).rejects.toMatchObject({
			status: 401
		});
		expect(resolveTypeRequest).not.toHaveBeenCalled();
		expect(queryMapObjects).not.toHaveBeenCalled();
	});
});

it("refunds failed single-object encryption and returns 503 while forwarding cancellation", async () => {
	vi.mocked(hasAnyFeatureAnywhereServer).mockReturnValue(true);
	vi.mocked(rateLimitConsume).mockResolvedValue([true, 100, 1000, {}]);
	vi.mocked(querySingleMapObject).mockRejectedValue(new CpuWorkerError("busy"));
	const event = {
		...requestEvent(MapObjectType.POKEMON, bounds),
		request: new Request("http://localhost/api/pokemon/pid_kX69sdRS2ZEpaKctGwMSZS1w9uOgYRBA"),
		params: { queryMapObject: MapObjectType.POKEMON, id: "pid_kX69sdRS2ZEpaKctGwMSZS1w9uOgYRBA" },
		fetch: vi.fn<typeof fetch>()
	};
	await expect(
		getSingle(event as unknown as Parameters<typeof getSingle>[0])
	).rejects.toMatchObject({
		status: 503
	});
	expect(querySingleMapObject).toHaveBeenCalledExactlyOnceWith(
		MapObjectType.POKEMON,
		event.params.id,
		event.fetch,
		expect.any(FeaturePermissionContext),
		event.request.signal
	);
	expect(rateLimitReward).toHaveBeenCalledExactlyOnceWith("u1", 2, MapObjectType.POKEMON);
});

describe("combined forts POST", () => {
	it.each([401, 409] as const)(
		"keeps 503 and %s per type and only queries and settles the healthy type",
		async (status) => {
			const data = {
				...bounds,
				types: {
					[MapObjectType.GYM]: {},
					[MapObjectType.POKESTOP]: { since: 100 },
					[MapObjectType.STATION]: {}
				}
			};
			const context = new FeaturePermissionContext(
				locals.perms,
				featureFamily[MapObjectType.POKESTOP]
			);
			vi.mocked(resolveTypeRequest).mockImplementation(async (type) => {
				if (type === MapObjectType.GYM) return { status: 503 };
				if (type === MapObjectType.STATION) return { status };
				return {
					status: 200,
					filter: undefined,
					permitted: { bounds, polygon: null },
					context,
					filterCached: "1"
				};
			});
			const result = { examined: 3, data: [] };
			vi.mocked(combinedForts).mockResolvedValue({ [MapObjectType.POKESTOP]: result });
			const event = requestEvent("forts", data);
			const response = await postForts(event as unknown as Parameters<typeof postForts>[0]);

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({
				[MapObjectType.GYM]: { status: 503 },
				[MapObjectType.STATION]: { status },
				[MapObjectType.POKESTOP]: { status: 200, filterCached: "1", result }
			});
			expect(resolveTypeRequest).toHaveBeenCalledTimes(3);
			for (const type of [
				MapObjectType.GYM,
				MapObjectType.POKESTOP,
				MapObjectType.STATION
			] as const) {
				expect(resolveTypeRequest).toHaveBeenCalledWith(
					type,
					locals,
					"u1",
					requestLimit,
					data,
					data.types[type],
					event.request.signal
				);
			}
			for (const call of vi.mocked(resolveTypeRequest).mock.calls) {
				expect(call[6]).toBe(event.request.signal);
			}
			expect(combinedForts).toHaveBeenCalledExactlyOnceWith({
				[MapObjectType.POKESTOP]: {
					filter: undefined,
					bounds,
					polygon: null,
					since: 100,
					limit: requestLimit,
					context,
					totalLimit,
					filterCached: "1"
				}
			});
			expect(settleTypeRequest).toHaveBeenCalledExactlyOnceWith(
				MapObjectType.POKESTOP,
				"u1",
				requestLimit,
				100,
				result
			);
			expect(queryMapObjects).not.toHaveBeenCalled();
			expect(rateLimitReward).not.toHaveBeenCalled();
			expect(refundDenied).not.toHaveBeenCalled();
		}
	);
});
