import { expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({
	master: vi.fn(async () => undefined),
	stats: vi.fn(async () => {
		throw { status: 503 };
	}),
	locale: vi.fn(async () => undefined),
	uicons: vi.fn(async () => undefined),
	fort: vi.fn(async () => undefined),
	cpu: vi.fn()
}));
vi.mock("@/lib/server/provider/masterfileProvider", () => ({
	masterfileProvider: { refresh: calls.master }
}));
vi.mock("@/lib/server/provider/masterStatsProvider", () => ({
	masterstatsProvider: { refresh: calls.stats }
}));
vi.mock("@/lib/server/provider/remoteLocaleProvider", () => ({
	remoteLocaleProvider: { refresh: calls.locale }
}));
vi.mock("@/lib/server/provider/uiconsIndexProvider", () => ({
	uiconsIndexProvider: { refresh: calls.uicons }
}));
vi.mock("@/lib/server/api/golbat/fortAvailability", () => ({ startFortApiDetection: calls.fort }));
vi.mock("@/lib/server/workers/cpu", () => ({ initCpuWorkers: calls.cpu }));

it("does not make optional aggregate availability a prerequisite for map initialization", async () => {
	const { initDiadem } = await import("./init");
	await expect(initDiadem()).resolves.toBeUndefined();
	for (const call of Object.values(calls)) expect(call).toHaveBeenCalledOnce();
});
