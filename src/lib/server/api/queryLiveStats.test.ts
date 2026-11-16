import { beforeEach, expect, it, vi } from "vitest";
import { getMultiplePokemon } from "./golbat/http";
import { query } from "@/lib/server/db/external/internalQuery";
import { queryLiveFortStats, queryLivePokemonStats } from "./queryLiveStats";

vi.mock("./golbat/http", () => ({ getMultiplePokemon: vi.fn() }));
vi.mock("@/lib/server/db/external/internalQuery", () => ({ query: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

it.each([0, 54321])(
	"uses the whole-tree total (%s), not returned rows or examined count",
	async (total) => {
		vi.mocked(getMultiplePokemon).mockResolvedValue({
			pokemon: [],
			examined: 0,
			skipped: 0,
			total
		});
		expect(await queryLivePokemonStats()).toBe(total);
		expect(getMultiplePokemon).toHaveBeenCalledExactlyOnceWith({
			min: { latitude: 0, longitude: 0 },
			max: { latitude: 0, longitude: 0 },
			limit: 1,
			filters: [{ pokemon: [] }]
		});
	}
);

it.each([undefined, {}, { total: -1 }, { total: NaN }, { total: "25" }, { total: 1.5 }])(
	"rejects missing/invalid metadata rather than inventing zero or scanning the world (%j)",
	async (response) => {
		vi.mocked(getMultiplePokemon).mockResolvedValue(response as never);
		await expect(queryLivePokemonStats()).rejects.toThrow("whole-tree total");
		expect(getMultiplePokemon).toHaveBeenCalledOnce();
		expect(query).not.toHaveBeenCalled();
	}
);

it("caps count statement deadlines and retains the existing unfiltered total semantics", async () => {
	vi.mocked(query)
		.mockResolvedValueOnce([{ count: 5 }])
		.mockResolvedValueOnce([{ count: 3 }]);
	expect(await queryLiveFortStats()).toEqual({ pokestops: 5, gyms: 3 });
	expect(query).toHaveBeenNthCalledWith(
		1,
		"SELECT COUNT(*) AS count FROM pokestop",
		undefined,
		8000
	);
	expect(query).toHaveBeenNthCalledWith(2, "SELECT COUNT(*) AS count FROM gym", undefined, 8000);
});

it("does not substitute zero for missing fort count rows", async () => {
	vi.mocked(query).mockResolvedValue([]);
	await expect(queryLiveFortStats()).rejects.toThrow("valid fort totals");
});

it("waits for both counts to settle before a failed refresh can release its lease", async () => {
	let finish!: (value: unknown) => void;
	vi.mocked(query)
		.mockRejectedValueOnce(new Error("first count failed"))
		.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				})
		);
	let settled = false;
	const result = queryLiveFortStats().catch((cause) => {
		settled = true;
		throw cause;
	});
	const assertion = expect(result).rejects.toThrow("first count failed");
	await Promise.resolve();
	await Promise.resolve();
	expect(settled).toBe(false);
	finish([{ count: 3 }]);
	await assertion;
});
