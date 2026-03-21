import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	hasTimer,
	getBestRank,
	getPokemonSize,
	getGenderLabel,
	getRarityLabel,
	typeIdToText,
	getNormalizedForm,
	reverseNormalizedFormPokemonIds,
	pokemonSizes
} from "./pokemonUtils";
import { getMasterPokemon } from "@/lib/services/masterfile";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";

const mockGetMasterPokemon = vi.mocked(getMasterPokemon);

function makePokemonData(overrides: Partial<PokemonData> = {}): PokemonData {
	return {
		id: "test-1",
		type: "pokemon" as any,
		mapId: "pokemon-test-1",
		pokestop_id: null,
		spawn_id: null,
		lat: 0,
		lon: 0,
		weight: null,
		size: null,
		height: null,
		expire_timestamp: null,
		updated: null,
		pokemon_id: 25,
		move_1: null,
		move_2: null,
		gender: null,
		cp: null,
		atk_iv: null,
		def_iv: null,
		sta_iv: null,
		iv: null,
		form: null,
		level: null,
		encounter_weather: 0,
		weather: null,
		costume: null,
		first_seen_timestamp: 0,
		changed: 0,
		cellId: null,
		expire_timestamp_verified: false,
		display_pokemon_id: null,
		is_ditto: false,
		seen_type: null,
		shiny: null,
		username: null,
		capture1: null,
		capture2: null,
		capture3: null,
		pvp: {},
		is_event: 0,
		strong: null,
		...overrides
	};
}

describe("hasTimer", () => {
	it("returns truthy when both timestamp and verified exist", () => {
		expect(hasTimer({ expire_timestamp: 1000, expire_timestamp_verified: true })).toBeTruthy();
		expect(hasTimer({ expire_timestamp: 1000, expire_timestamp_verified: 1 })).toBeTruthy();
	});

	it("returns falsy when timestamp is null/undefined/0", () => {
		expect(hasTimer({ expire_timestamp: null, expire_timestamp_verified: true })).toBeFalsy();
		expect(hasTimer({ expire_timestamp: 0, expire_timestamp_verified: true })).toBeFalsy();
		expect(hasTimer({ expire_timestamp: undefined, expire_timestamp_verified: true })).toBeFalsy();
	});

	it("returns falsy when verified is falsy", () => {
		expect(hasTimer({ expire_timestamp: 1000, expire_timestamp_verified: false })).toBeFalsy();
		expect(hasTimer({ expire_timestamp: 1000, expire_timestamp_verified: null })).toBeFalsy();
		expect(hasTimer({ expire_timestamp: 1000, expire_timestamp_verified: 0 })).toBeFalsy();
	});
});

describe("getBestRank", () => {
	it("returns 0 when no PVP data", () => {
		const data = makePokemonData({ pvp: {} });
		expect(getBestRank(data, "great")).toBe(0);
	});

	it("returns 0 when league array is empty (Math.min of empty is Infinity)", () => {
		const data = makePokemonData({ pvp: { great: [] } });
		expect(getBestRank(data, "great")).toBe(0);
	});

	it("returns the minimum rank from multiple entries", () => {
		const data = makePokemonData({
			pvp: {
				great: [
					{ rank: 5, cap: 50, cp: 1500, form: 0, level: 40, percentage: 99, pokemon: 25, value: 100 },
					{ rank: 1, cap: 50, cp: 1490, form: 0, level: 39, percentage: 100, pokemon: 25, value: 100 },
					{ rank: 10, cap: 50, cp: 1480, form: 0, level: 38, percentage: 98, pokemon: 25, value: 100 }
				]
			}
		});
		expect(getBestRank(data, "great")).toBe(1);
	});

	it("works for all three leagues", () => {
		const data = makePokemonData({
			pvp: {
				little: [{ rank: 3, cap: 50, cp: 500, form: 0, level: 20, percentage: 99, pokemon: 25, value: 100 }],
				great: [{ rank: 7, cap: 50, cp: 1500, form: 0, level: 40, percentage: 99, pokemon: 25, value: 100 }],
				ultra: [{ rank: 12, cap: 50, cp: 2500, form: 0, level: 45, percentage: 99, pokemon: 25, value: 100 }]
			}
		});
		expect(getBestRank(data, "little")).toBe(3);
		expect(getBestRank(data, "great")).toBe(7);
		expect(getBestRank(data, "ultra")).toBe(12);
	});
});

describe("getPokemonSize", () => {
	it("returns correct size labels", () => {
		expect(getPokemonSize(1)).toBe("XXS");
		expect(getPokemonSize(2)).toBe("XS");
		expect(getPokemonSize(3)).toBe("M");
		expect(getPokemonSize(4)).toBe("XL");
		expect(getPokemonSize(5)).toBe("XXL");
	});

	it("returns ? for unknown sizes", () => {
		expect(getPokemonSize(0)).toBe("?");
		expect(getPokemonSize(6)).toBe("?");
		expect(getPokemonSize(-1)).toBe("?");
	});
});

describe("getGenderLabel", () => {
	it("returns male label for gender 1", () => {
		expect(getGenderLabel(1)).toBe("pokemon_gender_male");
	});

	it("returns female label for gender 2", () => {
		expect(getGenderLabel(2)).toBe("pokemon_gender_female");
	});

	it("returns neutral label for other genders", () => {
		expect(getGenderLabel(0)).toBe("pokemon_gender_neutral");
		expect(getGenderLabel(3)).toBe("pokemon_gender_neutral");
	});
});

describe("getRarityLabel", () => {
	it("returns legendary when totalSpawns is 0", () => {
		expect(getRarityLabel(1, 0)).toBe("rarity_legendary");
	});

	it("returns common for ratio > 0.01", () => {
		expect(getRarityLabel(2, 100)).toBe("rarity_common");
	});

	it("returns uncommon for ratio > 0.001", () => {
		expect(getRarityLabel(2, 1000)).toBe("rarity_uncommon");
	});

	it("returns rare for ratio > 0.0001", () => {
		expect(getRarityLabel(2, 10000)).toBe("rarity_rare");
	});

	it("returns very rare for ratio > 0.00001", () => {
		expect(getRarityLabel(2, 100000)).toBe("rarity_very_rare");
	});

	it("returns extremely rare for ratio > 0.000001", () => {
		expect(getRarityLabel(2, 1000000)).toBe("rarity_extremely_rare");
	});

	it("returns legendary for extremely small ratios", () => {
		expect(getRarityLabel(1, 10000000)).toBe("rarity_legendary");
	});
});

describe("typeIdToText", () => {
	it("returns correct type names", () => {
		expect(typeIdToText(1)).toBe("normal");
		expect(typeIdToText(10)).toBe("fire");
		expect(typeIdToText(11)).toBe("water");
		expect(typeIdToText(12)).toBe("grass");
		expect(typeIdToText(18)).toBe("fairy");
	});

	it("returns normal for undefined or 0", () => {
		expect(typeIdToText(undefined)).toBe("normal");
		expect(typeIdToText(0)).toBe("normal");
	});

	it("returns normal for unknown type IDs", () => {
		expect(typeIdToText(99)).toBe("normal");
	});
});

describe("getNormalizedForm", () => {
	beforeEach(() => {
		mockGetMasterPokemon.mockReset();
	});

	it("returns 0 when pokemonId is falsy", () => {
		expect(getNormalizedForm(null, 5)).toBe(5);
		expect(getNormalizedForm(undefined, 5)).toBe(5);
		expect(getNormalizedForm(0, 5)).toBe(5);
	});

	it("returns formId or 0 when no master pokemon found", () => {
		mockGetMasterPokemon.mockReturnValue(undefined);
		expect(getNormalizedForm(25, 5)).toBe(5);
		expect(getNormalizedForm(25, null)).toBe(0);
	});

	it("normalizes reverse pokemon: form 0 -> defaultFormId", () => {
		// Unown (201) is in the reverse list
		mockGetMasterPokemon.mockReturnValue({
			defaultFormId: 61,
			forms: {}
		} as any);
		expect(getNormalizedForm(201, 0)).toBe(61);
	});

	it("keeps non-zero form for reverse pokemon", () => {
		mockGetMasterPokemon.mockReturnValue({
			defaultFormId: 61,
			forms: {}
		} as any);
		expect(getNormalizedForm(201, 62)).toBe(62);
	});

	it("normalizes regular pokemon: defaultFormId -> 0", () => {
		// Pikachu (25) is NOT in the reverse list
		mockGetMasterPokemon.mockReturnValue({
			defaultFormId: 808,
			forms: {}
		} as any);
		expect(getNormalizedForm(25, 808)).toBe(0);
	});

	it("keeps non-default form for regular pokemon", () => {
		mockGetMasterPokemon.mockReturnValue({
			defaultFormId: 808,
			forms: {}
		} as any);
		expect(getNormalizedForm(25, 809)).toBe(809);
	});

	it("returns 0 for null formId with no special handling", () => {
		mockGetMasterPokemon.mockReturnValue({
			defaultFormId: undefined,
			forms: {}
		} as any);
		expect(getNormalizedForm(25, null)).toBe(0);
	});
});

describe("reverseNormalizedFormPokemonIds", () => {
	it("contains known pokemon IDs", () => {
		expect(reverseNormalizedFormPokemonIds.has(201)).toBe(true); // Unown
		expect(reverseNormalizedFormPokemonIds.has(327)).toBe(true); // Spinda
		expect(reverseNormalizedFormPokemonIds.has(666)).toBe(true); // Vivillon
	});

	it("does not contain regular pokemon", () => {
		expect(reverseNormalizedFormPokemonIds.has(25)).toBe(false); // Pikachu
		expect(reverseNormalizedFormPokemonIds.has(1)).toBe(false); // Bulbasaur
	});
});

// --- PVP Display & masterPokemonToTypeText Tests ---

import { showLittle, showGreat, showUltra, masterPokemonToTypeText } from "./pokemonUtils";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { POKEMON_MIN_RANK } from "@/lib/constants";

const mockGetUserSettings = vi.mocked(getUserSettings);

function makePvpEntry(rank: number) {
	return { rank, cap: 50, cp: 1500, form: 0, level: 40, percentage: 99, pokemon: 25, value: 100 };
}

describe("showLittle", () => {
	beforeEach(() => {
		mockGetUserSettings.mockReturnValue({
			filters: { pokemon: { filters: [] } }
		} as any);
	});

	it("always shows when rank <= POKEMON_MIN_RANK", () => {
		const data = makePokemonData({ pvp: { little: [makePvpEntry(1)] } });
		expect(showLittle(data)).toBe(true);
	});

	it("always shows rank equal to POKEMON_MIN_RANK", () => {
		const data = makePokemonData({ pvp: { little: [makePvpEntry(POKEMON_MIN_RANK)] } });
		expect(showLittle(data)).toBe(true);
	});

	it("returns false when rank > POKEMON_MIN_RANK and no filters match", () => {
		const data = makePokemonData({ pvp: { little: [makePvpEntry(50)] } });
		expect(showLittle(data)).toBe(false);
	});

	it("returns true when ignoreFilters is true", () => {
		const data = makePokemonData({ pvp: { little: [makePvpEntry(50)] } });
		expect(showLittle(data, true)).toBe(true);
	});

	it("returns false when rank is 0 (no data) and ignoreFilters is false", () => {
		const data = makePokemonData({ pvp: {} });
		expect(showLittle(data)).toBe(false);
	});

	it("matches filter range", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				pokemon: {
					filters: [{
						enabled: true,
						pvpRankLittle: { min: 1, max: 100 }
					}]
				}
			}
		} as any);
		const data = makePokemonData({ pvp: { little: [makePvpEntry(50)] } });
		expect(showLittle(data)).toBe(true);
	});

	it("rejects when rank outside filter range", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				pokemon: {
					filters: [{
						enabled: true,
						pvpRankLittle: { min: 1, max: 10 }
					}]
				}
			}
		} as any);
		const data = makePokemonData({ pvp: { little: [makePvpEntry(50)] } });
		expect(showLittle(data)).toBe(false);
	});

	it("ignores disabled filters", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				pokemon: {
					filters: [{
						enabled: false,
						pvpRankLittle: { min: 1, max: 100 }
					}]
				}
			}
		} as any);
		const data = makePokemonData({ pvp: { little: [makePvpEntry(50)] } });
		expect(showLittle(data)).toBe(false);
	});
});

describe("showGreat", () => {
	beforeEach(() => {
		mockGetUserSettings.mockReturnValue({
			filters: { pokemon: { filters: [] } }
		} as any);
	});

	it("always shows when rank <= POKEMON_MIN_RANK", () => {
		const data = makePokemonData({ pvp: { great: [makePvpEntry(5)] } });
		expect(showGreat(data)).toBe(true);
	});

	it("matches filter range for great league", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				pokemon: {
					filters: [{
						enabled: true,
						pvpRankGreat: { min: 1, max: 50 }
					}]
				}
			}
		} as any);
		const data = makePokemonData({ pvp: { great: [makePvpEntry(25)] } });
		expect(showGreat(data)).toBe(true);
	});

	it("returns true when ignoreFilters is true", () => {
		const data = makePokemonData({ pvp: { great: [makePvpEntry(100)] } });
		expect(showGreat(data, true)).toBe(true);
	});
});

describe("showUltra", () => {
	beforeEach(() => {
		mockGetUserSettings.mockReturnValue({
			filters: { pokemon: { filters: [] } }
		} as any);
	});

	it("always shows when rank <= POKEMON_MIN_RANK", () => {
		const data = makePokemonData({ pvp: { ultra: [makePvpEntry(10)] } });
		expect(showUltra(data)).toBe(true);
	});

	it("matches filter range for ultra league", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				pokemon: {
					filters: [{
						enabled: true,
						pvpRankUltra: { min: 1, max: 100 }
					}]
				}
			}
		} as any);
		const data = makePokemonData({ pvp: { ultra: [makePvpEntry(80)] } });
		expect(showUltra(data)).toBe(true);
	});

	it("returns false when rank > POKEMON_MIN_RANK with no matching filters", () => {
		const data = makePokemonData({ pvp: { ultra: [makePvpEntry(50)] } });
		expect(showUltra(data)).toBe(false);
	});
});

describe("masterPokemonToTypeText", () => {
	it("returns secondary type when available", () => {
		expect(masterPokemonToTypeText({ types: [10, 3] } as any)).toBe("flying");
	});

	it("falls back to primary type when no secondary", () => {
		expect(masterPokemonToTypeText({ types: [10] } as any)).toBe("fire");
	});

	it("returns normal when types is empty", () => {
		expect(masterPokemonToTypeText({ types: [] } as any)).toBe("normal");
	});

	it("returns normal when types is undefined", () => {
		expect(masterPokemonToTypeText({} as any)).toBe("normal");
	});

	it("returns normal for null masterPokemon", () => {
		expect(masterPokemonToTypeText(null as any)).toBe("normal");
	});
});
