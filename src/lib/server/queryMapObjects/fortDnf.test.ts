import { describe, expect, it, vi } from "vitest";
import { buildGymDnfFilters, buildPokestopDnfFilters, buildStationDnfFilters } from "./fortDnf";

vi.mock("@/lib/features/activeSearch.svelte", () => ({
	getActiveSearch: () => undefined
}));
vi.mock("@/lib/services/userSettings.svelte", () => ({
	getUserSettings: () => ({}),
	defaultFilter: () => ({ enabled: true, filters: [] })
}));
vi.mock("@/lib/services/ingameLocale", () => ({
	mAlignment: () => "",
	mGeneration: () => "",
	mItem: () => "",
	mPokemon: () => "",
	mType: () => ""
}));
vi.mock("@/lib/services/uicons.svelte", () => ({
	getIconContest: () => "",
	getIconPokemon: () => "",
	getIconType: () => ""
}));
vi.mock("@/lib/utils/pokemonUtils", () => ({
	getNormalizedForm: (_pokemonId: number, form: number) => form
}));

const disabled = { enabled: false };

describe("buildGymDnfFilters", () => {
	it("matches all when plain gyms are shown", () => {
		expect(
			buildGymDnfFilters({
				gymPlain: { enabled: true },
				raid: { enabled: true, filters: [] }
			} as any)
		).toEqual([]);
	});

	it("translates levels, eggs and bosses into separate OR clauses", () => {
		const result = buildGymDnfFilters({
			gymPlain: { enabled: false },
			raid: {
				enabled: true,
				filters: [
					{
						enabled: true,
						show: ["egg"],
						levels: [5],
						bosses: [{ pokemon_id: 150, temp_evolution_id: 2 }]
					}
				]
			}
		} as any);
		expect(result).toContainEqual({ raid_pokemon_id: [{ pokemon_id: 0 }] });
		expect(result).toContainEqual({ raid_level: [5] });
		expect(result).toContainEqual({
			raid_pokemon_id: [{ pokemon_id: 150 }],
			raid_temp_evolution_id: [2]
		});
	});

	it("keeps the boss clause a superset of the SQL branch even when levels are set", () => {
		const result = buildGymDnfFilters({
			gymPlain: { enabled: false },
			raid: {
				enabled: true,
				filters: [{ enabled: true, show: ["boss"], levels: [5] }]
			}
		} as any);
		expect(result).toContainEqual({ raid_level: [5] });
		const anyLevelClause = result!.find((c) => c.raid_level && c.raid_level.length >= 9);
		expect(anyLevelClause).toBeDefined();
	});

	it("falls back to an any-active-raid clause when raid filter has no conditions", () => {
		const result = buildGymDnfFilters({
			gymPlain: { enabled: false },
			raid: { enabled: true, filters: [{ enabled: true }] }
		} as any);
		expect(result).toHaveLength(1);
		expect(result![0].raid_level!.length).toBeGreaterThanOrEqual(9);
	});
});

describe("buildPokestopDnfFilters", () => {
	it("matches all when plain pokestops are shown", () => {
		expect(
			buildPokestopDnfFilters({ enabled: true, pokestopPlain: { enabled: true } } as any)
		).toEqual([]);
	});

	it("matches nothing when enabled but no sub-filter is on", () => {
		expect(
			buildPokestopDnfFilters({
				enabled: true,
				pokestopPlain: disabled,
				lure: disabled,
				quest: disabled,
				invasion: disabled,
				goldPokestop: disabled,
				kecleon: disabled,
				contest: disabled
			} as any)
		).toBeNull();
	});

	it("translates invasions with characters exactly like the SQL", () => {
		const result = buildPokestopDnfFilters({
			enabled: true,
			pokestopPlain: disabled,
			lure: disabled,
			quest: disabled,
			invasion: { enabled: true, filters: [{ enabled: true, characters: [41, 42] }] },
			goldPokestop: disabled,
			kecleon: disabled,
			contest: disabled
		} as any);
		expect(result).toEqual([{ incident_display_type: [1, 2, 3], incident_character: [41, 42] }]);
	});

	it("pushes a stardust range as reward_type + amount in one AND clause", () => {
		const result = buildPokestopDnfFilters({
			enabled: true,
			pokestopPlain: disabled,
			lure: disabled,
			quest: {
				enabled: true,
				filters: [{ enabled: true, stardust: { min: 500, max: Infinity } }]
			},
			invasion: disabled,
			goldPokestop: disabled,
			kecleon: disabled,
			contest: disabled
		} as any);
		expect(result).toEqual([
			{ quest_reward_type: [3], quest_reward_amount: { min: 500, max: 32767 } }
		]);
	});

	it("clamps finite reward ranges to Golbat's int16 wire type", () => {
		const result = buildPokestopDnfFilters({
			enabled: true,
			pokestopPlain: disabled,
			lure: disabled,
			quest: {
				enabled: true,
				filters: [{ enabled: true, xp: { min: -50000, max: 50000 } }]
			},
			invasion: disabled,
			goldPokestop: disabled,
			kecleon: disabled,
			contest: disabled
		} as any);
		expect(result).toEqual([
			{ quest_reward_type: [1], quest_reward_amount: { min: -32768, max: 32767 } }
		]);
	});

	it("pushes showcase ranking and structured buddy focus", () => {
		const result = buildPokestopDnfFilters({
			enabled: true,
			pokestopPlain: disabled,
			lure: disabled,
			quest: disabled,
			invasion: disabled,
			goldPokestop: disabled,
			kecleon: disabled,
			contest: {
				enabled: true,
				filters: [
					{
						enabled: true,
						rankingStandard: 4,
						focus: { type: "buddy", min_level: 2 }
					}
				]
			}
		} as any);
		expect(result).toEqual([
			{
				incident_display_type: [9],
				contest_ranking_standard: [4],
				contest_focus: [{ type: "buddy", min_level: 2 }]
			}
		]);
	});
});

describe("buildStationDnfFilters", () => {
	it("adds station_active to every battle clause", () => {
		const result = buildStationDnfFilters({
			enabled: true,
			stationPlain: { enabled: false },
			maxBattle: {
				enabled: true,
				filters: [{ enabled: true, bosses: [{ pokemon_id: 809, bread_mode: 2 }] }]
			}
		} as any);
		expect(result).toEqual([{ station_active: true, battle_pokemon: [{ pokemon_id: 809 }] }]);
	});

	it("translates hasGmax", () => {
		const result = buildStationDnfFilters({
			enabled: true,
			stationPlain: { enabled: false },
			maxBattle: { enabled: true, filters: [{ enabled: true, hasGmax: true }] }
		} as any);
		expect(result).toEqual([{ station_active: true, stationed_gmax: true }]);
	});
});
