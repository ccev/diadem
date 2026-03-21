import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMapsUrl } from "./mapUrl";
import { getUserSettings, ExternalMapProvider } from "@/lib/services/userSettings.svelte";
import type { Coords } from "@/lib/utils/coordinates";

const mockGetUserSettings = vi.mocked(getUserSettings);

function coords(lat: number, lon: number) {
	return { lat, lon } as unknown as Coords;
}

describe("getMapsUrl", () => {
	beforeEach(() => {
		mockGetUserSettings.mockReturnValue({
			externalMapProvider: ExternalMapProvider.GOOGLE
		} as any);
	});

	it("returns Google Maps URL by default", () => {
		const result = getMapsUrl(coords(48.8566, 2.3522));
		expect(result).toBe("https://maps.google.com?q=48.8566,2.3522");
	});

	it("returns Apple Maps URL when provider is Apple", () => {
		mockGetUserSettings.mockReturnValue({
			externalMapProvider: ExternalMapProvider.APPLE
		} as any);
		const result = getMapsUrl(coords(48.8566, 2.3522));
		expect(result).toBe("https://maps.apple.com/?ll=48.8566,2.3522");
	});

	it("includes name in Apple Maps URL when provided", () => {
		mockGetUserSettings.mockReturnValue({
			externalMapProvider: ExternalMapProvider.APPLE
		} as any);
		const result = getMapsUrl(coords(48.8566, 2.3522), "Eiffel Tower");
		expect(result).toBe("https://maps.apple.com/?ll=48.8566,2.3522&q=Eiffel%20Tower");
	});

	it("ignores name for Google Maps", () => {
		const result = getMapsUrl(coords(48.8566, 2.3522), "Eiffel Tower");
		expect(result).toBe("https://maps.google.com?q=48.8566,2.3522");
	});

	it("handles negative coordinates", () => {
		const result = getMapsUrl(coords(-33.8688, -151.2093));
		expect(result).toBe("https://maps.google.com?q=-33.8688,-151.2093");
	});

	it("encodes special characters in Apple Maps name", () => {
		mockGetUserSettings.mockReturnValue({
			externalMapProvider: ExternalMapProvider.APPLE
		} as any);
		const result = getMapsUrl(coords(0, 0), "Café & Bar");
		expect(result).toContain("q=Caf%C3%A9%20%26%20Bar");
	});
});
