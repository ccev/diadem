import { afterEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ read: vi.fn(), publish: vi.fn() }));
vi.mock("@/lib/server/api/queryStats", () => ({ queryMasterStats: fixture.read }));
vi.mock("@/lib/features/masterStats.svelte", () => ({ setMasterStats: fixture.publish }));
afterEach(() => vi.useRealTimers());

it("retains an unavailable state during cooldown and permits recovery after ten seconds", async () => {
	vi.useFakeTimers();
	fixture.read.mockRejectedValueOnce({ status: 503 }).mockResolvedValue({ generatedAt: 1 });
	const { MasterstatsProvider } = await import("./masterStatsProvider");
	const provider = new MasterstatsProvider();
	await expect(provider.get()).rejects.toMatchObject({ status: 503 });
	await expect(provider.get()).rejects.toMatchObject({ status: 503 });
	expect(fixture.read).toHaveBeenCalledOnce();
	expect(fixture.publish).not.toHaveBeenCalled();
	await vi.advanceTimersByTimeAsync(10_000);
	expect(await provider.get()).toEqual({ generatedAt: 1 });
	expect(fixture.read).toHaveBeenCalledTimes(2);
});
