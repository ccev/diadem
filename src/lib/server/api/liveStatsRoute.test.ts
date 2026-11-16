import { beforeEach, expect, it, vi } from "vitest";
import { getLiveStats } from "./liveStats";
import { GET } from "@/routes/api/stats/live/+server";

vi.mock("./liveStats", () => ({ getLiveStats: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

it("preserves the successful live-stat response contract", async () => {
	const stats = { pokemon: 10, pokestops: 20, gyms: 30 };
	vi.mocked(getLiveStats).mockResolvedValue(stats);
	const response = await GET({
		request: new Request("http://localhost/api/stats/live")
	} as Parameters<typeof GET>[0]);
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual(stats);
});

it("returns retryable 503, not successful fabricated counters, when no usable values exist", async () => {
	vi.mocked(getLiveStats).mockRejectedValue(new Error("metadata unavailable"));
	const response = await GET({
		request: new Request("http://localhost/api/stats/live")
	} as Parameters<typeof GET>[0]);
	expect(response.status).toBe(503);
	expect(response.headers.get("Retry-After")).toBe("10");
	expect(response.headers.get("Cache-Control")).toBe("private, no-store");
	expect(await response.json()).toEqual({ pokemon: {}, generatedAt: 0 });
});
