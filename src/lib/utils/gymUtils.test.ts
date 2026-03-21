import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	isFortOutdated,
	hasActiveRaid,
	isRaidHatched,
	getRaidPokemon,
	shouldDisplayRaid,
	RaidLevel,
	getDefaultGymFilter,
	getActiveGymFilter
} from "./gymUtils";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import type { GymData } from "@/lib/types/mapObjectData/gym";

const mockTimestamp = vi.mocked(currentTimestamp);

function makeGymData(overrides: Partial<GymData> = {}): GymData {
	return {
		id: "gym-1",
		mapId: "gym-gym-1",
		type: "gym" as any,
		lat: 0,
		lon: 0,
		updated: Math.floor(Date.now() / 1000),
		deleted: 0,
		first_seen_timestamp: 0,
		...overrides
	};
}

describe("isFortOutdated", () => {
	beforeEach(() => {
		mockTimestamp.mockReturnValue(1000000);
	});

	it("returns true when updated is undefined", () => {
		expect(isFortOutdated(undefined)).toBe(true);
	});

	it("returns true when fort is older than 24h", () => {
		// FORT_OUTDATED_SECONDS = 86400 (24h)
		expect(isFortOutdated(1000000 - 86401)).toBe(true);
	});

	it("returns false when fort is fresh", () => {
		expect(isFortOutdated(1000000 - 100)).toBe(false);
	});

	it("returns false at exact threshold", () => {
		expect(isFortOutdated(1000000 - 86400)).toBe(false);
	});
});

describe("hasActiveRaid", () => {
	beforeEach(() => {
		mockTimestamp.mockReturnValue(1000);
	});

	it("returns true when raid end is in the future", () => {
		expect(hasActiveRaid(makeGymData({ raid_end_timestamp: 1500 }))).toBe(true);
	});

	it("returns false when raid end is in the past", () => {
		expect(hasActiveRaid(makeGymData({ raid_end_timestamp: 500 }))).toBe(false);
	});

	it("returns false when raid end equals current time", () => {
		expect(hasActiveRaid(makeGymData({ raid_end_timestamp: 1000 }))).toBe(false);
	});

	it("returns false when raid_end_timestamp is undefined", () => {
		expect(hasActiveRaid(makeGymData({}))).toBe(false);
	});
});

describe("isRaidHatched", () => {
	beforeEach(() => {
		mockTimestamp.mockReturnValue(1000);
	});

	it("returns true when battle timestamp is in the past", () => {
		expect(isRaidHatched(makeGymData({ raid_battle_timestamp: 500 }))).toBe(true);
	});

	it("returns false when battle timestamp is in the future", () => {
		expect(isRaidHatched(makeGymData({ raid_battle_timestamp: 1500 }))).toBe(false);
	});

	it("returns true when raid_battle_timestamp is undefined (0 < current)", () => {
		expect(isRaidHatched(makeGymData({}))).toBe(true);
	});
});

describe("getRaidPokemon", () => {
	it("maps gym raid fields to pokemon data", () => {
		const gym = makeGymData({
			raid_pokemon_id: 150,
			raid_pokemon_form: 1,
			raid_pokemon_cp: 50000,
			raid_pokemon_gender: 2,
			raid_pokemon_costume: 0,
			raid_pokemon_evolution: 0,
			raid_pokemon_alignment: 0,
			raid_pokemon_move_1: 100,
			raid_pokemon_move_2: 200
		});

		const result = getRaidPokemon(gym);
		expect(result.pokemon_id).toBe(150);
		expect(result.form).toBe(1);
		expect(result.cp).toBe(50000);
		expect(result.gender).toBe(2);
		expect(result.move_1).toBe(100);
		expect(result.move_2).toBe(200);
	});

	it("handles undefined raid pokemon fields", () => {
		const gym = makeGymData({});
		const result = getRaidPokemon(gym);
		expect(result.pokemon_id).toBeUndefined();
		expect(result.form).toBeUndefined();
	});
});

describe("RaidLevel enum", () => {
	it("has correct values", () => {
		expect(RaidLevel.STAR_1).toBe(1);
		expect(RaidLevel.STAR_3).toBe(3);
		expect(RaidLevel.LEGENDARY).toBe(5);
		expect(RaidLevel.MEGA).toBe(6);
		expect(RaidLevel.MEGA_LEGENDARY).toBe(7);
		expect(RaidLevel.ULTRA_BEAST).toBe(8);
		expect(RaidLevel.ELITE).toBe(9);
		expect(RaidLevel.PRIMAL).toBe(10);
		expect(RaidLevel.SHADOW_STAR_1).toBe(11);
		expect(RaidLevel.SHADOW_STAR_3).toBe(13);
		expect(RaidLevel.SHADOW_LEGENDARY).toBe(15);
	});
});

describe("getDefaultGymFilter", () => {
	it("returns a filter with gym category and sub-filters", () => {
		const filter = getDefaultGymFilter();
		expect(filter.category).toBe("gym");
		expect(filter.enabled).toBe(true);
		expect(filter.gymPlain.category).toBe("gymPlain");
		expect(filter.gymPlain.enabled).toBe(true);
		expect(filter.raid.category).toBe("raid");
		expect(filter.raid.enabled).toBe(true);
	});
});

// --- shouldDisplayRaid Tests ---

import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";
import { getActiveSearch } from "@/lib/features/activeSearch.svelte";
import type { FilterGym } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

const mockGetUserSettings = vi.mocked(getUserSettings);
const mockIsOverwrite = vi.mocked(isCurrentSelectedOverwrite);
const mockGetActiveSearch = vi.mocked(getActiveSearch);

function makeGymFilter(overrides: Partial<FilterGym> = {}): FilterGym {
	return {
		category: "gym",
		enabled: true,
		filters: [] as never[],
		gymPlain: { category: "gymPlain", enabled: true, filters: [] },
		raid: { category: "raid", enabled: true, filters: [] },
		...overrides
	} as FilterGym;
}

function setGymFilters(overrides: Partial<FilterGym>) {
	const filter = makeGymFilter(overrides);
	mockGetUserSettings.mockReturnValue({ filters: { gym: filter } } as any);
}

describe("shouldDisplayRaid", () => {
	beforeEach(() => {
		mockTimestamp.mockReturnValue(1000);
		mockIsOverwrite.mockReturnValue(false);
		mockGetActiveSearch.mockReturnValue(undefined);
		setGymFilters({});
	});

	it("returns false when raid has expired", () => {
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 500, raid_level: 5 }))).toBe(false);
	});

	it("returns false when no raid_level", () => {
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000 }))).toBe(false);
	});

	it("returns true when current selected overwrite", () => {
		mockIsOverwrite.mockReturnValue(true);
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5 }))).toBe(true);
	});

	it("returns false when gym filter disabled", () => {
		setGymFilters({ enabled: false });
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5 }))).toBe(false);
	});

	it("returns false when raid sub-filter disabled", () => {
		setGymFilters({ raid: { category: "raid", enabled: false, filters: [] } });
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5 }))).toBe(false);
	});

	it("returns true when filters is undefined (no filtersets)", () => {
		setGymFilters({ raid: { category: "raid", enabled: true, filters: undefined as any } });
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5 }))).toBe(true);
	});

	it("returns true when no enabled filters", () => {
		setGymFilters({ raid: { category: "raid", enabled: true, filters: [] } });
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5 }))).toBe(true);
	});

	it("matches raid level filter", () => {
		setGymFilters({
			raid: {
				category: "raid",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					levels: [5, 6]
				}]
			}
		});
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5 }))).toBe(true);
	});

	it("rejects non-matching raid level", () => {
		setGymFilters({
			raid: {
				category: "raid",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					levels: [3]
				}]
			}
		});
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5 }))).toBe(false);
	});

	it("matches boss pokemon filter", () => {
		setGymFilters({
			raid: {
				category: "raid",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					bosses: [{ pokemon_id: 150, form: 0 }]
				}]
			}
		});
		expect(shouldDisplayRaid(makeGymData({
			raid_end_timestamp: 2000,
			raid_level: 5,
			raid_pokemon_id: 150,
			raid_pokemon_form: 0
		}))).toBe(true);
	});

	it("matches boss pokemon filter ignoring form when form is 0/undefined", () => {
		setGymFilters({
			raid: {
				category: "raid",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					bosses: [{ pokemon_id: 150, form: 0 }]
				}]
			}
		});
		expect(shouldDisplayRaid(makeGymData({
			raid_end_timestamp: 2000,
			raid_level: 5,
			raid_pokemon_id: 150,
			raid_pokemon_form: 5
		}))).toBe(true);
	});

	it("rejects non-matching boss pokemon", () => {
		setGymFilters({
			raid: {
				category: "raid",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					bosses: [{ pokemon_id: 151, form: 0 }]
				}]
			}
		});
		expect(shouldDisplayRaid(makeGymData({
			raid_end_timestamp: 2000,
			raid_level: 5,
			raid_pokemon_id: 150,
			raid_pokemon_form: 0
		}))).toBe(false);
	});

	it("show filter: egg only - shows egg, hides boss", () => {
		setGymFilters({
			raid: {
				category: "raid",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					show: ["egg"]
				}]
			}
		});
		// Egg (no pokemon_id)
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5 }))).toBe(true);
		// Boss (has pokemon_id)
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5, raid_pokemon_id: 150 }))).toBe(false);
	});

	it("show filter: boss only - shows boss, hides egg", () => {
		setGymFilters({
			raid: {
				category: "raid",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					show: ["boss"]
				}]
			}
		});
		// Boss
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5, raid_pokemon_id: 150 }))).toBe(true);
		// Egg
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5 }))).toBe(false);
	});

	it("show filter with levels: only shows if level also matches", () => {
		setGymFilters({
			raid: {
				category: "raid",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					show: ["egg"],
					levels: [5]
				}]
			}
		});
		// Egg with matching level
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5 }))).toBe(true);
		// Egg with non-matching level - show filter skips because it's egg, but levels don't match
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 3 }))).toBe(false);
	});

	it("disabled filter is ignored", () => {
		setGymFilters({
			raid: {
				category: "raid",
				enabled: true,
				filters: [
					{
						id: "f1", title: { message: "" }, enabled: false, icon: { isUserSelected: false },
						levels: [5]
					},
					{
						id: "f2", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
						levels: [3]
					}
				]
			}
		});
		// Level 5 filter is disabled, level 3 is enabled
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 5 }))).toBe(false);
		expect(shouldDisplayRaid(makeGymData({ raid_end_timestamp: 2000, raid_level: 3 }))).toBe(true);
	});
});

describe("getActiveGymFilter", () => {
	beforeEach(() => {
		mockGetActiveSearch.mockReturnValue(undefined);
		setGymFilters({});
	});

	it("returns user settings gym filter when no active search", () => {
		const result = getActiveGymFilter();
		expect(result.category).toBe("gym");
	});

	it("returns active search filter when search is for gym", () => {
		const searchFilter = makeGymFilter({ enabled: false });
		mockGetActiveSearch.mockReturnValue({
			mapObject: MapObjectType.GYM,
			filter: searchFilter,
			entries: []
		} as any);
		const result = getActiveGymFilter();
		expect(result.enabled).toBe(false);
	});

	it("returns user settings filter when active search is for different type", () => {
		mockGetActiveSearch.mockReturnValue({
			mapObject: MapObjectType.POKESTOP,
			filter: {} as any,
			entries: []
		} as any);
		const result = getActiveGymFilter();
		expect(result.category).toBe("gym");
	});
});
