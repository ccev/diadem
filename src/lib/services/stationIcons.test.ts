import { getDefaultStationFilter, hasMaxBattle } from "@/lib/utils/stationUtils";
import { shouldDisplayStation } from "@/lib/features/filterLogic/station";
import { getIconStation, initIconSet } from "@/lib/services/uicons.svelte";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/config/config", () => ({}));
vi.mock("@/lib/native/runtime", () => ({}));
vi.mock("@/lib/features/activeSearch.svelte", () => ({}));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({
	isCurrentSelectedOverwrite: () => false
}));
vi.mock("@/lib/services/userSettings.svelte", () => ({
	defaultFilter: (enabled = false) => ({ enabled, filters: [] }),
	getUserSettings: () => ({ uiconSet: { station: { id: "test" } } })
}));
vi.mock("@/lib/services/ingameLocale", () => ({}));
vi.mock("@/lib/services/masterfile", () => ({}));
vi.mock("@/lib/features/filterLogic/pokestop", () => ({}));
vi.mock("@/lib/utils/pokestopUtils", () => ({ RewardType: {} }));
vi.mock("@/lib/utils/gymUtils", () => ({}));
vi.mock("@/lib/utils/pokemonUtils", () => ({}));
vi.mock("@/lib/utils/currentTimestamp", () => ({ currentTimestamp: () => 100 }));
vi.mock("uicons.js", () => ({
	UICONS: class {
		init() {}
		station({ active }: { active: boolean }) {
			return active ? "active-station.png" : "grey-station.png";
		}
	}
}));

beforeAll(async () => {
	await initIconSet("test", "https://icons.example", async () => new Response("{}"));
});

describe("station activity icons", () => {
	const station = {
		battle_pokemon_id: 215,
		start_time: 99,
		end_time: 200,
		is_inactive: 0,
		is_battle_available: 1
	};

	it.each([
		{ is_inactive: 1 },
		{ is_battle_available: 0 },
		{ is_inactive: 1, is_battle_available: 0 },
		{ start_time: 150 }
	])("keeps a visible inactive boss on a grey station (%j)", (overrides) => {
		const data = { ...station, ...overrides };
		const filter = getDefaultStationFilter();
		filter.enabled = true;
		filter.maxBattle.enabled = true;
		expect(hasMaxBattle(data)).toBe(true);
		expect(shouldDisplayStation(data, filter)).toBe(true);
		expect(getIconStation(data)).toBe("grey-station.png");
	});

	it("keeps an active battle's station icon active", () => {
		expect(hasMaxBattle(station)).toBe(true);
		expect(getIconStation(station)).toBe("active-station.png");
	});
});
