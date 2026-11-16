import { afterEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/server/db/external/internalQuery", () => db);
vi.mock("@/lib/server/api/golbat/fortAvailability", () => ({
	getCachedFortAvailability: () => undefined
}));
vi.mock("@/lib/server/provider/masterfileProvider", () => ({
	masterfileProvider: { get: async () => ({}) }
}));
vi.mock("@/lib/services/masterfile", () => ({ getMasterPokemon: vi.fn() }));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => ({}) }));
vi.mock("@/lib/server/api/talonflame", () => ({ fetchTalonflameStats: vi.fn() }));
vi.mock("@/lib/utils/pokemonUtils", () => ({ getNormalizedForm: vi.fn() }));
vi.mock("@/lib/utils/pokestopUtils", () => ({
	getQuestKey: vi.fn(),
	parseQuestReward: vi.fn(),
	RewardType: {}
}));
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

it("serializes slow startup scans before entering the bounded SQL admission queue", async () => {
	vi.useFakeTimers();
	vi.stubGlobal("fetch", async () => ({ ok: true, json: async () => [] }));
	let running = 0;
	let peak = 0;
	db.query.mockImplementation(async () => {
		peak = Math.max(peak, ++running);
		await new Promise((resolve) => setTimeout(resolve, 2000));
		running--;
		return [];
	});
	const { queryMasterStats } = await import("./queryStats");
	const result = queryMasterStats();
	await vi.advanceTimersByTimeAsync(17_000);
	await result;
	expect(peak).toBe(1);
	expect(db.query).toHaveBeenCalledTimes(8);
});

it("rejects a failed bootstrap batch without issuing its later scans", async () => {
	vi.stubGlobal("fetch", async () => ({ ok: true, json: async () => [] }));
	db.query.mockRejectedValue({ status: 503 });
	const { queryMasterStats } = await import("./queryStats");
	await expect(queryMasterStats()).rejects.toMatchObject({ status: 503 });
	expect(db.query).toHaveBeenCalledOnce();
});
