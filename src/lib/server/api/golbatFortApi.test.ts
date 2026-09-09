import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FortAvailability } from "@/lib/server/queryMapObjects/queries";

const golbat = vi.hoisted(() => ({
	fetchFortAvailability: vi.fn(),
	fetchGolbatStatus: vi.fn()
}));

vi.mock("@/lib/server/api/golbatApi", () => golbat);

const availability: FortAvailability = {
	gyms: { raids: [] },
	pokestops: { quests: [], invasions: [], lures: [], showcases: [] },
	stations: { battles: [] }
};

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
		golbat.fetchFortAvailability.mockResolvedValue(availability);

		const api = await import("./golbatFortApi");
		await api.refreshFortAvailability();

		expect(api.isFortApiEnabled()).toBe(true);
		expect(api.getCachedFortAvailability()).toBe(availability);
		expect(api.getFortApiScanLimit(10001)).toBe(9000);
		expect(api.getFortApiScanLimit(100)).toBe(100);
	});

	it("uses SQL when the status contract is unavailable", async () => {
		golbat.fetchGolbatStatus.mockResolvedValue(undefined);

		const api = await import("./golbatFortApi");
		await api.refreshFortAvailability();

		expect(api.isFortApiEnabled()).toBe(false);
		expect(golbat.fetchFortAvailability).not.toHaveBeenCalled();
	});

	it("clears availability on failure and recovers on the next refresh", async () => {
		golbat.fetchGolbatStatus.mockResolvedValue({
			features: { fort_in_memory: true },
			limits: { max_fort_results: 9000 }
		});
		golbat.fetchFortAvailability.mockResolvedValue(availability);
		const api = await import("./golbatFortApi");
		await api.refreshFortAvailability();

		golbat.fetchFortAvailability.mockRejectedValueOnce(new Error("Golbat unavailable"));
		await api.refreshFortAvailability();
		expect(api.isFortApiEnabled()).toBe(false);
		expect(api.getCachedFortAvailability()).toBeUndefined();

		await api.refreshFortAvailability();
		expect(api.isFortApiEnabled()).toBe(true);
		expect(api.getCachedFortAvailability()).toBe(availability);
	});
});
