import { beforeEach, describe, expect, it, vi } from "vitest";

const golbat = vi.hoisted(() => ({
	fetchFortAvailability: vi.fn(),
	fetchGolbatStatus: vi.fn()
}));

vi.mock("@/lib/server/api/golbatApi", () => golbat);

describe("Golbat fort API detection", () => {
	beforeEach(() => {
		vi.resetModules();
		golbat.fetchFortAvailability.mockReset();
		golbat.fetchGolbatStatus.mockReset();
	});

	it("enables the API and applies the reported scan limit", async () => {
		golbat.fetchGolbatStatus.mockResolvedValue({
			features: { fort_in_memory: true },
			limits: { max_fort_results: 9000 }
		});
		golbat.fetchFortAvailability.mockResolvedValue({
			gyms: { raids: [] },
			pokestops: { quests: [], invasions: [], lures: [], showcases: [] },
			stations: { battles: [] }
		});

		const api = await import("./golbatFortApi");
		await api.refreshFortAvailability();

		expect(api.isFortApiEnabled()).toBe(true);
		expect(api.getFortApiScanLimit(10001)).toBe(9000);
	});

	it("uses SQL when the status contract is unavailable", async () => {
		golbat.fetchGolbatStatus.mockResolvedValue(undefined);

		const api = await import("./golbatFortApi");
		await api.refreshFortAvailability();

		expect(api.isFortApiEnabled()).toBe(false);
		expect(golbat.fetchFortAvailability).not.toHaveBeenCalled();
	});
});
