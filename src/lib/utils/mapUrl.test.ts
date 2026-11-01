import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMapsUrl } from "@/lib/utils/mapUrl";
import type { Coords } from "@/lib/utils/coordinates";

const state = vi.hoisted(() => ({ native: false, platform: "web", provider: "google" }));

vi.mock("@/lib/native/runtime", () => ({ isNative: () => state.native }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => state.platform } }));
vi.mock("@/lib/services/userSettings.svelte", () => ({
	ExternalMapProvider: { APPLE: "apple", GOOGLE: "google" },
	getUserSettings: () => ({ externalMapProvider: state.provider })
}));

const coords = { lat: 52.52, lon: 13.405 } as Coords;

describe("map navigation links", () => {
	beforeEach(() => {
		state.native = false;
		state.platform = "web";
		state.provider = "google";
	});

	it("opens Apple Maps on iOS instead of using Android's geo scheme", () => {
		state.native = true;
		state.platform = "ios";
		expect(getMapsUrl(coords)).toBe("https://maps.apple.com/?ll=52.52,13.405");
		expect(getMapsUrl(coords, "Gym & Café")).toBe(
			"https://maps.apple.com/?ll=52.52,13.405&q=Gym%20%26%20Caf%C3%A9"
		);
	});

	it("uses the native map app chooser on Android", () => {
		state.native = true;
		state.platform = "android";
		expect(getMapsUrl(coords, "Gym & Café")).toBe(
			"geo:52.52,13.405?q=52.52%2C13.405(Gym%20%26%20Caf%C3%A9)"
		);
	});

	it("honors the selected map provider on the web", () => {
		expect(getMapsUrl(coords)).toBe("https://maps.google.com?q=52.52,13.405");
		state.provider = "apple";
		expect(getMapsUrl(coords)).toBe("https://maps.apple.com/?ll=52.52,13.405");
	});
});
