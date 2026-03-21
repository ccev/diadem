import { describe, it, expect, vi, beforeEach } from "vitest";

// Unmock masterfile so we test the real implementation
vi.unmock("@/lib/services/masterfile");

import {
	defaultProp,
	getMasterPokemon,
	getSpawnablePokemon,
	calculateCp,
	getMasterWeather,
	getAllLureModuleIds,
	overwriteMasterfile
} from "./masterfile";
import type { MasterFile, MasterPokemon } from "@/lib/types/masterfile";
import { getPokemonStats } from "@/lib/features/masterStats.svelte";

const mockGetPokemonStats = vi.mocked(getPokemonStats);

function makeMasterPokemon(overrides: Partial<MasterPokemon> = {}): MasterPokemon {
	return {
		name: "TestMon",
		forms: {},
		legendary: false,
		mythical: false,
		ultraBeast: false,
		baseAtk: 200,
		baseDef: 150,
		baseSta: 180,
		...overrides
	} as any;
}

function setupMasterfile(pokemon: Record<string, any> = {}, weather: Record<string, any> = {}, items: string[] = []) {
	overwriteMasterfile({
		pokemon,
		weather,
		items
	} as MasterFile);
}

describe("defaultProp", () => {
	it("returns fallback when obj is falsy", () => {
		expect(defaultProp(undefined, "key", "fallback")).toBe("fallback");
		expect(defaultProp(null, "key", "fallback")).toBe("fallback");
	});

	it("returns fallback when key is missing", () => {
		expect(defaultProp({ other: 1 }, "key", "fallback")).toBe("fallback");
	});

	it("returns value when key exists", () => {
		expect(defaultProp({ key: 42 }, "key", "fallback")).toBe(42);
	});

	it("returns fallback for null/undefined values (via ??)", () => {
		expect(defaultProp({ key: null }, "key", "fallback")).toBe("fallback");
		expect(defaultProp({ key: undefined }, "key", "fallback")).toBe("fallback");
	});

	it("returns 0 and empty string (falsy but not nullish)", () => {
		expect(defaultProp({ key: 0 }, "key", "fallback")).toBe(0);
		expect(defaultProp({ key: "" }, "key", "fallback")).toBe("");
	});
});

describe("getMasterPokemon", () => {
	beforeEach(() => {
		setupMasterfile({
			"25": {
				...makeMasterPokemon({ name: "Pikachu" }),
				forms: {
					"1": makeMasterPokemon({ name: "Pikachu Alola" }),
					"2": makeMasterPokemon({ name: "Pikachu Galar" })
				},
				tempEvos: {
					"1": makeMasterPokemon({ name: "Pikachu GMax" })
				}
			}
		});
	});

	it("returns base pokemon with just pokemonId", () => {
		const result = getMasterPokemon(25);
		expect(result?.name).toBe("Pikachu");
	});

	it("returns form override when formId is provided", () => {
		const result = getMasterPokemon(25, 1);
		expect(result?.name).toBe("Pikachu Alola");
	});

	it("returns tempEvo override when tempEvoId is provided", () => {
		const result = getMasterPokemon(25, undefined, 1);
		expect(result?.name).toBe("Pikachu GMax");
	});

	it("tempEvo takes priority over form when both specified", () => {
		const result = getMasterPokemon(25, 1, 1);
		expect(result?.name).toBe("Pikachu GMax");
	});

	it("falls back to base when form is missing", () => {
		const result = getMasterPokemon(25, 999);
		expect(result?.name).toBe("Pikachu");
	});

	it("falls back to form when tempEvo is missing", () => {
		const result = getMasterPokemon(25, 1, 999);
		expect(result?.name).toBe("Pikachu Alola");
	});

	it("falls back to base when both form and tempEvo are missing", () => {
		const result = getMasterPokemon(25, 999, 999);
		expect(result?.name).toBe("Pikachu");
	});

	it("returns undefined for missing pokemonId", () => {
		expect(getMasterPokemon(9999)).toBeUndefined();
	});
});

describe("getSpawnablePokemon", () => {
	beforeEach(() => {
		mockGetPokemonStats.mockReturnValue(undefined);
		setupMasterfile({
			"1": {
				...makeMasterPokemon({ name: "Bulbasaur" }),
				forms: {
					"1": { ...makeMasterPokemon(), name: "Shadow", unreleased: false, isCostume: false }
				}
			},
			"25": {
				...makeMasterPokemon({ name: "Pikachu" }),
				forms: {
					"1": { ...makeMasterPokemon(), name: "Normal", unreleased: false },
					"2": { ...makeMasterPokemon(), name: "Pikachu Hat 2023", unreleased: false, isCostume: true },
					"3": { ...makeMasterPokemon(), name: "Alola", unreleased: false }
				}
			},
			"150": {
				...makeMasterPokemon({ name: "Mewtwo", mythical: false, legendary: true }),
				forms: {}
			},
			"151": {
				...makeMasterPokemon({ name: "Mew", mythical: true }),
				forms: {}
			},
			"412": {
				...makeMasterPokemon({ name: "Burmy" }),
				forms: {
					"1": { ...makeMasterPokemon(), name: "Plant", unreleased: false }
				}
			},
			"800": {
				...makeMasterPokemon({ name: "Necrozma", ultraBeast: true }),
				forms: {}
			},
			"900": {
				...makeMasterPokemon({ name: "Unreleased", unreleased: true }),
				forms: {}
			}
		});
	});

	it("skips mythical pokemon", () => {
		const result = getSpawnablePokemon();
		expect(result.find(p => p.pokemon_id === 151)).toBeUndefined();
	});

	it("skips ultraBeast pokemon", () => {
		const result = getSpawnablePokemon();
		expect(result.find(p => p.pokemon_id === 800)).toBeUndefined();
	});

	it("skips unreleased pokemon", () => {
		const result = getSpawnablePokemon();
		expect(result.find(p => p.pokemon_id === 900)).toBeUndefined();
	});

	it("skips blacklisted base pokemon (412)", () => {
		const result = getSpawnablePokemon();
		expect(result.find(p => p.pokemon_id === 412 && p.form === 0)).toBeUndefined();
	});

	it("includes blacklisted base pokemon forms", () => {
		const result = getSpawnablePokemon();
		expect(result.find(p => p.pokemon_id === 412 && p.form === 1)).toBeDefined();
	});

	it("includes valid base pokemon", () => {
		const result = getSpawnablePokemon();
		expect(result.find(p => p.pokemon_id === 1 && p.form === 0)).toBeDefined();
	});

	it("includes legendary pokemon", () => {
		const result = getSpawnablePokemon();
		expect(result.find(p => p.pokemon_id === 150)).toBeDefined();
	});

	it("excludes Normal-named forms", () => {
		const result = getSpawnablePokemon();
		// Pikachu form 1 is "Normal" → excluded
		expect(result.find(p => p.pokemon_id === 25 && p.form === 1)).toBeUndefined();
	});

	it("excludes costume forms", () => {
		const result = getSpawnablePokemon();
		// Pikachu form 2 has isCostume=true → excluded
		expect(result.find(p => p.pokemon_id === 25 && p.form === 2)).toBeUndefined();
	});

	it("skips forms of blacklisted form pokemon (25=pikachu)", () => {
		const result = getSpawnablePokemon();
		// Pikachu (25) is in blacklistForms, so all forms are skipped
		expect(result.find(p => p.pokemon_id === 25 && p.form === 3)).toBeUndefined();
	});

	it("includes valid forms", () => {
		const result = getSpawnablePokemon();
		// Bulbasaur form 1 "Shadow" is valid (not Normal, not Costume, not year)
		expect(result.find(p => p.pokemon_id === 1 && p.form === 1)).toBeDefined();
	});

	it("excludes year-specific forms (name containing '20')", () => {
		setupMasterfile({
			"1": {
				...makeMasterPokemon({ name: "Bulbasaur" }),
				forms: {
					"10": { ...makeMasterPokemon(), name: "2024 Event", unreleased: false }
				}
			}
		});
		const result = getSpawnablePokemon();
		expect(result.find(p => p.pokemon_id === 1 && p.form === 10)).toBeUndefined();
	});
});

describe("calculateCp", () => {
	beforeEach(() => {
		setupMasterfile({
			"25": {
				...makeMasterPokemon({ name: "Pikachu" }),
				baseAtk: 112,
				baseDef: 96,
				baseSta: 111,
				forms: {},
				tempEvos: {}
			}
		});
	});

	it("calculates CP correctly at level 20 with perfect IVs", () => {
		const cp = calculateCp(20, 25, 0);
		expect(cp).toBeDefined();
		expect(typeof cp).toBe("number");
		// (112+15) * sqrt(96+15) * sqrt(111+15) * 0.5974^2 / 10
		const expected = Math.floor(
			(127 * Math.sqrt(111) * Math.sqrt(126) * Math.pow(0.597400009632111, 2)) / 10
		);
		expect(cp).toBe(expected);
	});

	it("calculates CP with custom IVs", () => {
		const cp = calculateCp(20, 25, 0, [0, 0, 0]);
		expect(cp).toBeDefined();
		const expected = Math.floor(
			(112 * Math.sqrt(96) * Math.sqrt(111) * Math.pow(0.597400009632111, 2)) / 10
		);
		expect(cp).toBe(expected);
	});

	it("returns undefined for missing pokemon", () => {
		const cp = calculateCp(20, 9999, 0);
		expect(cp).toBeUndefined();
	});

	it("returns undefined for invalid level", () => {
		const cp = calculateCp(99 as any, 25, 0);
		expect(cp).toBeUndefined();
	});
});

describe("getMasterWeather", () => {
	beforeEach(() => {
		setupMasterfile({}, {
			"1": { name: "Clear", types: [1, 3] },
			"2": { name: "Rainy", types: [5, 8, 11] }
		});
	});

	it("returns weather by ID", () => {
		expect(getMasterWeather(1)?.name).toBe("Clear");
		expect(getMasterWeather("2")?.name).toBe("Rainy");
	});

	it("returns undefined for missing weather ID", () => {
		expect(getMasterWeather(99)).toBeUndefined();
	});

	it("returns undefined for undefined input", () => {
		expect(getMasterWeather(undefined)).toBeUndefined();
	});
});

describe("getAllLureModuleIds", () => {
	it("filters items starting with '5'", () => {
		setupMasterfile({}, {}, ["501", "502", "1", "300", "503"]);
		const result = getAllLureModuleIds();
		expect(result).toEqual([501, 502, 503]);
	});

	it("returns empty array when no lure items", () => {
		setupMasterfile({}, {}, ["1", "2", "300"]);
		expect(getAllLureModuleIds()).toEqual([]);
	});
});
