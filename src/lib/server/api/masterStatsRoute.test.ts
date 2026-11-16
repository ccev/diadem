import { expect, it, vi } from "vitest";
vi.mock("@/lib/server/provider/masterStatsProvider", () => ({
	masterstatsProvider: {
		get: vi.fn(async () => {
			throw { status: 503 };
		})
	}
}));
vi.mock("@/lib/server/api/queryStats", () => ({ mergeFortAvailability: vi.fn() }));
vi.mock("@/lib/server/api/golbat/fortAvailability", () => ({ FORT_API_REFRESH_SECONDS: 5 }));

it("does not cache a successful empty substitute for failed master statistics", async () => {
	const { GET } = await import("../../../routes/api/stats/+server");
	const event = { request: new Request("http://localhost/api/stats") } as Parameters<typeof GET>[0];
	const res = await GET(event);
	expect(res.status).toBe(503);
	expect(res.headers.get("retry-after")).toBe("10");
	expect(res.headers.get("cache-control")).toContain("no-store");
	expect(await res.json()).toEqual({ error: "Master statistics temporarily unavailable" });
});
