import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FortAvailability } from "./types";

const golbat = vi.hoisted(() => ({
	fetchFortAvailability: vi.fn(),
	fetchGolbatStatus: vi.fn()
}));

vi.mock("@/lib/server/api/golbat/http", () => golbat);

const golbatConfig = vi.hoisted(() => ({
	url: "http://127.0.0.1:1",
	fortApi: undefined as boolean | undefined
}));
vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({ golbat: golbatConfig })
}));

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
		golbatConfig.fortApi = undefined;
	});

	it("stays on SQL when server.golbat.fortApi is false, even if Golbat offers the API", async () => {
		golbatConfig.fortApi = false;
		golbat.fetchGolbatStatus.mockResolvedValue({
			features: { fort_in_memory: true },
			limits: { max_fort_results: 9000 }
		});
		golbat.fetchFortAvailability.mockResolvedValue(availability);

		const api = await import("./fortAvailability");
		await api.startFortApiDetection();
		await api.refreshFortAvailability();

		expect(api.isFortApiEnabled()).toBe(false);
		expect(api.getCachedFortAvailability()).toBeUndefined();
		expect(golbat.fetchGolbatStatus).not.toHaveBeenCalled();
		expect(golbat.fetchFortAvailability).not.toHaveBeenCalled();
	});

	it("enables the API and applies the reported scan limit", async () => {
		golbat.fetchGolbatStatus.mockResolvedValue({
			features: { fort_in_memory: true },
			limits: { max_fort_results: 9000 }
		});
		golbat.fetchFortAvailability.mockResolvedValue(availability);

		const api = await import("./fortAvailability");
		await api.refreshFortAvailability();

		expect(api.isFortApiEnabled()).toBe(true);
		expect(api.getCachedFortAvailability()).toBe(availability);
		expect(api.getFortApiScanLimit(10001)).toBe(9000);
		expect(api.getFortApiScanLimit(100)).toBe(100);
	});

	it("uses SQL when the status contract is unavailable", async () => {
		golbat.fetchGolbatStatus.mockResolvedValue(undefined);

		const api = await import("./fortAvailability");
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
		const api = await import("./fortAvailability");
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
