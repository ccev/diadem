import { afterAll, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
	vi.stubGlobal("$state", (value: unknown) => value);
	return {
		config: {
			general: {},
			uiconSets: [{ id: "test", url: "/icons" }]
		},
		storage: new Map<string, string>(),
		fetch: vi.fn()
	};
});
vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("@/lib/services/config/config", () => ({ getConfig: () => state.config }));
vi.mock("@/lib/services/themeMode", () => ({
	getDefaultMapStyle: () => ({ id: "test", url: "/style" })
}));
vi.mock("@/lib/services/user/userDetails.svelte.js", () => ({
	getUserDetails: () => ({ details: { id: "user" } })
}));
vi.mock("@/lib/native/runtime", () => ({ isNative: () => false }));
vi.mock("@/lib/features/filters/icons", () => ({
	IconCategory: { POKEMON: "pokemon", RAID: "raid" }
}));
vi.mock("@/lib/utils/gymUtils", () => ({
	getDefaultGymFilter: () => ({ category: "gym", enabled: true, filters: [] })
}));
vi.mock("@/lib/utils/pokestopUtils", () => ({
	getDefaultPokestopFilter: () => ({ category: "pokestop", enabled: false, filters: [] })
}));
vi.mock("@/lib/utils/stationUtils", () => ({
	getDefaultStationFilter: () => ({ category: "station", enabled: false, filters: [] })
}));
import { getUserSettings, setUserSettings } from "./userSettings.svelte";

beforeEach(() => {
	state.storage.clear();
	vi.stubGlobal("window", { localStorage: {} });
	vi.stubGlobal("localStorage", {
		setItem: (key: string, value: string) => state.storage.set(key, value)
	});
	vi.stubGlobal("fetch", state.fetch.mockReset().mockResolvedValue(new Response("{}")));
});
afterAll(() => vi.unstubAllGlobals());

it("trims old saved search history while preserving most recent entries", () => {
	const history = Array.from({ length: 1000 }, (_, i) => ({
		key: String(i),
		name: "Location " + i
	})) as any;
	setUserSettings({ recentSearches: history });
	expect(getUserSettings().recentSearches).toEqual(history.slice(0, 20));
});
