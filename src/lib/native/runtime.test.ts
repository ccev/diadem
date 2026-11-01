import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { encode } from "@msgpack/msgpack";
import { fetchInstanceMapName, normalizeInstanceUrl } from "@/lib/native/runtime";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@capacitor/core", () => ({
	Capacitor: { getPlatform: () => "android" },
	CapacitorHttp: { request }
}));

describe("normalizeInstanceUrl", () => {
	it("strips a trailing slash", () => {
		expect(normalizeInstanceUrl("https://demap.co/")).toBe("https://demap.co");
	});
	it("adds https:// when no scheme is present", () => {
		expect(normalizeInstanceUrl("demap.co")).toBe("https://demap.co");
	});
	it("preserves an explicit http scheme and port", () => {
		expect(normalizeInstanceUrl("http://192.168.1.5:5173")).toBe("http://192.168.1.5:5173");
	});
	it("accepts pasted map URLs and normalizes the origin", () => {
		expect(normalizeInstanceUrl(" HTTPS://DEMAP.CO/map?lang=en#location ")).toBe(
			"https://demap.co"
		);
		expect(normalizeInstanceUrl("demap.co/map")).toBe("https://demap.co");
		expect(normalizeInstanceUrl("localhost:5173/map")).toBe("https://localhost:5173");
	});
	it("rejects unsupported schemes, invalid hosts, and embedded credentials", () => {
		for (const value of [
			"ftp://demap.co",
			"javascript:alert(1)",
			"https://",
			"not a host",
			"https://user:password@demap.co"
		]) {
			expect(normalizeInstanceUrl(value)).toBe("");
		}
	});
	it("returns empty string for empty input", () => {
		expect(normalizeInstanceUrl("")).toBe("");
		expect(normalizeInstanceUrl("   ")).toBe("");
	});
});

describe("fetchInstanceMapName", () => {
	afterEach(() => vi.useRealTimers());
	beforeEach(() => {
		request.mockReset();
	});

	it("probes the normalized origin with explicit negotiation and finite timeouts", async () => {
		request.mockResolvedValue({
			status: 200,
			headers: { "Content-Type": "application/json" },
			data: { general: { mapName: "Demap" } }
		});
		expect(await fetchInstanceMapName("demap.co/map?lang=en")).toBe("Demap");
		expect(request).toHaveBeenCalledWith({
			url: "https://demap.co/api/config",
			method: "GET",
			headers: { Accept: "application/json", "Accept-Encoding": "identity" },
			connectTimeout: 15_000,
			readTimeout: 15_000,
			responseType: "blob"
		});
	});

	it("accepts a MessagePack configuration even when a cache ignores JSON negotiation", async () => {
		const bytes = encode({ general: { mapName: "Demap" } });
		request.mockResolvedValue({
			status: 200,
			headers: { "content-type": "application/msgpack; charset=binary" },
			data: btoa(String.fromCharCode(...bytes))
		});
		expect(await fetchInstanceMapName("demap.co")).toBe("Demap");
	});

	it("accepts vendor JSON returned as a base64 blob", async () => {
		request.mockResolvedValue({
			status: 200,
			headers: { "content-type": "application/vnd.diadem+json" },
			data: btoa(JSON.stringify({ general: { mapName: "Demap" } }))
		});
		expect(await fetchInstanceMapName("demap.co")).toBe("Demap");
	});

	it("rejects non-instance responses and malformed or empty map names", async () => {
		for (const data of [
			null,
			{},
			{ general: null },
			{ general: { mapName: 1 } },
			{ general: { mapName: "  " } }
		]) {
			request.mockResolvedValue({
				status: 200,
				headers: { "content-type": "application/json" },
				data
			});
			expect(await fetchInstanceMapName("demap.co")).toBeNull();
		}
		request.mockResolvedValue({
			status: 200,
			headers: { "content-type": "text/html" },
			data: btoa("<html>error</html>")
		});
		expect(await fetchInstanceMapName("demap.co")).toBeNull();
	});

	it("handles HTTP errors, native network failures, and invalid URLs", async () => {
		request.mockResolvedValue({ status: 503 });
		expect(await fetchInstanceMapName("demap.co")).toBeNull();
		request.mockRejectedValue(new Error("Offline"));
		expect(await fetchInstanceMapName("demap.co")).toBeNull();
		request.mockClear();
		expect(await fetchInstanceMapName("https://")).toBeNull();
		expect(request).not.toHaveBeenCalled();
	});
});

it("returns a failed probe within the total deadline when native networking stalls", async () => {
	vi.useFakeTimers();
	request.mockReturnValue(new Promise(() => {}));
	const result = fetchInstanceMapName("demap.co");
	await vi.advanceTimersByTimeAsync(15_000);
	await expect(result).resolves.toBeNull();
	vi.useRealTimers();
});
