import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	shouldDisplayStation,
	getStationPokemon,
	getStationTitle,
	getActiveStationFilter
} from "./stationUtils";
import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { getActiveSearch } from "@/lib/features/activeSearch.svelte";
import type { StationData } from "@/lib/types/mapObjectData/station";

const mockIsOverwrite = vi.mocked(isCurrentSelectedOverwrite);
const mockGetUserSettings = vi.mocked(getUserSettings);
const mockGetActiveSearch = vi.mocked(getActiveSearch);

function makeStationData(overrides: Partial<StationData> = {}): StationData {
	return {
		id: "station-1",
		mapId: "station-station-1",
		type: "station" as any,
		lat: 0,
		lon: 0,
		name: "Test Station",
		cell_id: 0n,
		start_time: 0,
		end_time: 0,
		cooldown_complete: 0,
		is_battle_available: 0,
		is_inactive: 0,
		updated: 0,
		...overrides
	};
}

describe("getStationPokemon", () => {
	it("maps station battle fields to pokemon data", () => {
		const station = makeStationData({
			battle_pokemon_id: 25,
			battle_pokemon_form: 1,
			battle_pokemon_costume: 2,
			battle_pokemon_gender: 1,
			battle_pokemon_alignment: 0,
			battle_pokemon_bread_mode: 3,
			battle_pokemon_move_1: 100,
			battle_pokemon_move_2: 200
		});

		const result = getStationPokemon(station);
		expect(result).toEqual({
			pokemon_id: 25,
			form: 1,
			costume: 2,
			gender: 1,
			alignment: 0,
			bread_mode: 3,
			move_1: 100,
			move_2: 200
		});
	});

	it("returns undefined fields when station has no battle pokemon", () => {
		const result = getStationPokemon(makeStationData());
		expect(result.pokemon_id).toBeUndefined();
		expect(result.form).toBeUndefined();
	});
});

describe("getStationTitle", () => {
	it("returns pokemon name when battle_pokemon_id is set", () => {
		const station = makeStationData({ battle_pokemon_id: 25, battle_pokemon_form: 0 });
		const title = getStationTitle(station);
		expect(title).toBe("pokemon:25:0");
	});

	it("returns station name when no battle pokemon", () => {
		const station = makeStationData({ name: "My Station" });
		expect(getStationTitle(station)).toBe("My Station");
	});

	it("returns default pogo_station when no name and no battle pokemon", () => {
		const station = makeStationData({ name: undefined as any });
		expect(getStationTitle(station)).toBe("pogo_station");
	});
});

describe("shouldDisplayStation", () => {
	beforeEach(() => {
		mockIsOverwrite.mockReturnValue(false);
		mockGetActiveSearch.mockReturnValue(undefined);
		mockGetUserSettings.mockReturnValue({
			filters: {
				station: {
					enabled: true,
					stationPlain: { enabled: true },
					maxBattle: { enabled: true, filters: [] }
				}
			}
		} as any);
	});

	it("returns true when overwrite is active", () => {
		mockIsOverwrite.mockReturnValue(true);
		mockGetUserSettings.mockReturnValue({
			filters: { station: { enabled: false, stationPlain: { enabled: false }, maxBattle: { enabled: false, filters: [] } } }
		} as any);
		expect(shouldDisplayStation(makeStationData())).toBe(true);
	});

	it("returns false when station filter is disabled", () => {
		mockGetUserSettings.mockReturnValue({
			filters: { station: { enabled: false, stationPlain: { enabled: true }, maxBattle: { enabled: true, filters: [] } } }
		} as any);
		expect(shouldDisplayStation(makeStationData())).toBe(false);
	});

	it("returns true when stationPlain is enabled", () => {
		expect(shouldDisplayStation(makeStationData())).toBe(true);
	});

	it("returns true when maxBattle filters are empty (show all)", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				station: {
					enabled: true,
					stationPlain: { enabled: false },
					maxBattle: { enabled: true, filters: [] }
				}
			}
		} as any);
		expect(shouldDisplayStation(makeStationData())).toBe(true);
	});

	it("returns true when boss matches filterset", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				station: {
					enabled: true,
					stationPlain: { enabled: false },
					maxBattle: {
						enabled: true,
						filters: [{
							enabled: true,
							bosses: [{ pokemon_id: 25, form: 0, bread_mode: 1 }]
						}]
					}
				}
			}
		} as any);
		expect(shouldDisplayStation(makeStationData({
			battle_pokemon_id: 25,
			battle_pokemon_form: 0,
			battle_pokemon_bread_mode: 1
		}))).toBe(true);
	});

	it("returns false when boss does not match", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				station: {
					enabled: true,
					stationPlain: { enabled: false },
					maxBattle: {
						enabled: true,
						filters: [{
							enabled: true,
							bosses: [{ pokemon_id: 150, form: 0, bread_mode: 0 }]
						}]
					}
				}
			}
		} as any);
		expect(shouldDisplayStation(makeStationData({
			battle_pokemon_id: 25,
			battle_pokemon_form: 0,
			battle_pokemon_bread_mode: 0
		}))).toBe(false);
	});

	it("returns false when bread_mode does not match", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				station: {
					enabled: true,
					stationPlain: { enabled: false },
					maxBattle: {
						enabled: true,
						filters: [{
							enabled: true,
							bosses: [{ pokemon_id: 25, form: 0, bread_mode: 1 }]
						}]
					}
				}
			}
		} as any);
		expect(shouldDisplayStation(makeStationData({
			battle_pokemon_id: 25,
			battle_pokemon_form: 0,
			battle_pokemon_bread_mode: 2
		}))).toBe(false);
	});

	it("skips disabled filtersets", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				station: {
					enabled: true,
					stationPlain: { enabled: false },
					maxBattle: {
						enabled: true,
						filters: [
							{ enabled: false, bosses: [{ pokemon_id: 25, form: 0, bread_mode: 0 }] },
						]
					}
				}
			}
		} as any);
		// No enabled filters → show all
		expect(shouldDisplayStation(makeStationData())).toBe(true);
	});

	it("uses active search filter when available", () => {
		mockGetActiveSearch.mockReturnValue({
			mapObject: "station" as any,
			filter: {
				enabled: true,
				stationPlain: { enabled: false },
				maxBattle: {
					enabled: true,
					filters: [{ enabled: true, bosses: [{ pokemon_id: 150, form: 0, bread_mode: 0 }] }]
				}
			}
		} as any);
		expect(shouldDisplayStation(makeStationData({
			battle_pokemon_id: 150,
			battle_pokemon_form: 0,
			battle_pokemon_bread_mode: 0
		}))).toBe(true);
		expect(shouldDisplayStation(makeStationData({
			battle_pokemon_id: 25,
			battle_pokemon_form: 0,
			battle_pokemon_bread_mode: 0
		}))).toBe(false);
	});
});
