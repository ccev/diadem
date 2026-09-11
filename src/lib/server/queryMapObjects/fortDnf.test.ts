import type { BaseFilterset } from "@/lib/features/filters/filtersets";
import { getDefaultGymFilter } from "@/lib/utils/gymUtils";
import { getDefaultPokestopFilter, RewardType } from "@/lib/utils/pokestopUtils";
import { getDefaultStationFilter } from "@/lib/utils/stationUtils";
import { describe, expect, it, vi } from "vitest";
import { buildGymDnfFilters, buildPokestopDnfFilters, buildStationDnfFilters } from "./fortDnf";

vi.mock("@/lib/features/activeSearch.svelte", () => ({}));
vi.mock("@/lib/services/userSettings.svelte", () => ({
	defaultFilter: (enabled = false) => ({ enabled, filters: [] })
}));
vi.mock("@/lib/services/ingameLocale", () => ({}));
vi.mock("@/lib/services/uicons.svelte", () => ({}));
vi.mock("@/lib/services/masterfile", () => ({}));

const filterset: BaseFilterset = {
	id: "test",
	title: { message: "test" },
	enabled: true,
	icon: { isUserSelected: false }
};

describe("buildGymDnfFilters", () => {
	it("matches all when plain gyms are shown", () => {
		expect(buildGymDnfFilters(getDefaultGymFilter())).toEqual([]);
	});

	it("translates levels, eggs and bosses into OR clauses without form constraints", () => {
		const filter = getDefaultGymFilter();
		filter.gymPlain.enabled = false;
		filter.raid.filters = [
			{
				...filterset,
				show: ["egg"],
				levels: [5],
				bosses: [
					{ pokemon_id: 150, form: 0, temp_evolution_id: 2 },
					{ pokemon_id: 25, form: 61 }
				]
			},
			{ ...filterset, enabled: false, levels: [1] }
		];

		expect(buildGymDnfFilters(filter)).toStrictEqual([
			{ raid_pokemon_id: [{ pokemon_id: 0 }] },
			{ raid_level: [5] },
			{ raid_pokemon_id: [{ pokemon_id: 150 }], raid_temp_evolution_id: [2] },
			{ raid_pokemon_id: [{ pokemon_id: 25 }] }
		]);
	});

	it("keeps the boss clause a superset of the SQL branch even when levels are set", () => {
		const filter = getDefaultGymFilter();
		filter.gymPlain.enabled = false;
		filter.raid.filters = [{ ...filterset, show: ["boss"], levels: [5] }];

		const result = buildGymDnfFilters(filter);
		expect(result).toContainEqual({ raid_level: [5] });
		const anyLevelClause = result.find((c) => c.raid_level && c.raid_level.length >= 9);
		expect(anyLevelClause).toBeDefined();
	});

	it("falls back to an any-active-raid clause when raid filter has no conditions", () => {
		const filter = getDefaultGymFilter();
		filter.gymPlain.enabled = false;
		filter.raid.filters = [{ ...filterset }];

		const result = buildGymDnfFilters(filter);
		expect(result).toHaveLength(1);
		expect(result[0].raid_level!.length).toBeGreaterThanOrEqual(9);
	});
});

describe("buildPokestopDnfFilters", () => {
	it("matches all when plain pokestops are shown", () => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;
		filter.pokestopPlain.enabled = true;

		expect(buildPokestopDnfFilters(filter)).toEqual([]);
	});

	it("matches nothing when enabled but no sub-filter is on", () => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;

		expect(buildPokestopDnfFilters(filter)).toBeNull();
	});

	it("ignores disabled subfilters and filtersets", () => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;
		filter.quest.filters = [{ ...filterset, item: [{ id: "1" }] }];
		filter.lure.enabled = true;
		filter.lure.filters = [
			{ ...filterset, items: [501] },
			{ ...filterset, enabled: false, items: [502] }
		];

		expect(buildPokestopDnfFilters(filter)).toStrictEqual([{ lure_id: [501] }]);
	});

	it("translates invasions with characters exactly like the SQL", () => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;
		filter.invasion.enabled = true;
		filter.invasion.filters = [{ ...filterset, characters: [41, 42] }];

		expect(buildPokestopDnfFilters(filter)).toEqual([
			{ incident_display_type: [1, 2, 3], incident_character: [41, 42] }
		]);
	});

	it("pushes nonnegative integer reward ranges within int16 without changing their bounds", () => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;
		filter.quest.enabled = true;
		filter.quest.filters = [
			{
				...filterset,
				stardust: { min: 500, max: 1000 },
				pokecoins: { min: 0, max: 0 },
				xp: { min: 0, max: 32767 }
			}
		];

		expect(buildPokestopDnfFilters(filter)).toStrictEqual([
			{ quest_reward_type: [RewardType.STARDUST], quest_reward_amount: { min: 500, max: 1000 } },
			{ quest_reward_type: [RewardType.POKECOINS], quest_reward_amount: { min: 0, max: 0 } },
			{ quest_reward_type: [RewardType.XP], quest_reward_amount: { min: 0, max: 32767 } }
		]);
	});

	it.each([
		{ min: 500, max: Infinity },
		{ min: -Infinity, max: 1000 },
		{ min: 0, max: 32768 },
		{ min: 50000, max: 100000 },
		{ min: 50000, max: 1000 },
		{ min: -1, max: 500 },
		{ min: 0.5, max: 500 },
		{ min: 0, max: 500.5 }
	])("leaves unsafe reward amounts undefined instead of clamping ($min to $max)", (range) => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;
		filter.quest.enabled = true;
		filter.quest.filters = [{ ...filterset, stardust: range }];

		expect(buildPokestopDnfFilters(filter)).toStrictEqual([
			{ quest_reward_type: [RewardType.STARDUST], quest_reward_amount: undefined }
		]);
	});

	it("coalesces item, mega and candy rewards without losing IDs or constraining forms", () => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;
		filter.quest.enabled = true;
		filter.quest.filters = [
			{
				...filterset,
				pokemon: [
					{ pokemon_id: 25, form: 0 },
					{ pokemon_id: 133, form: 61 }
				],
				item: [
					{ id: "1", amount: 3 },
					{ id: "2", amount: 5 }
				],
				megaResource: [
					{ id: "6", amount: 25 },
					{ id: "9", amount: 50 }
				],
				candy: [{ id: "25", amount: 3 }, { id: "133" }],
				xlCandy: [{ id: "150", amount: 1 }, { id: "151" }]
			},
			{ ...filterset, enabled: false, item: [{ id: "3" }] }
		];

		expect(buildPokestopDnfFilters(filter)).toStrictEqual([
			{
				quest_reward_type: [RewardType.POKEMON],
				quest_reward_pokemon: [{ pokemon_id: 25 }, { pokemon_id: 133 }]
			},
			{ quest_reward_type: [RewardType.ITEM], quest_reward_item_id: [1, 2] },
			{
				quest_reward_type: [RewardType.MEGA_ENERGY, RewardType.TEMP_EVO_BRANCH_RESOURCE],
				quest_reward_pokemon: [{ pokemon_id: 6 }, { pokemon_id: 9 }]
			},
			{
				quest_reward_type: [RewardType.CANDY, RewardType.XL_CANDY],
				quest_reward_pokemon: [
					{ pokemon_id: 25 },
					{ pokemon_id: 133 },
					{ pokemon_id: 150 },
					{ pokemon_id: 151 }
				]
			}
		]);
	});

	it("pushes showcase species and type without normalized form constraints", () => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;
		filter.contest.enabled = true;
		filter.contest.filters = [
			{
				...filterset,
				rankingStandard: 0,
				focus: { type: "pokemon", pokemon_id: 25, pokemon_form: 0 }
			},
			{
				...filterset,
				rankingStandard: 1,
				focus: { type: "type", pokemon_type_1: 13, pokemon_type_2: 4 }
			},
			{
				...filterset,
				enabled: false,
				rankingStandard: 0,
				focus: { type: "pokemon", pokemon_id: 133 }
			}
		];

		expect(buildPokestopDnfFilters(filter)).toStrictEqual([
			{
				incident_display_type: [9],
				contest_ranking_standard: [0],
				contest_pokemon: [{ pokemon_id: 25 }]
			},
			{
				incident_display_type: [9],
				contest_ranking_standard: [1],
				contest_pokemon_type: [13]
			}
		]);
	});

	it("pushes showcase ranking and structured buddy focus", () => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;
		filter.contest.enabled = true;
		filter.contest.filters = [
			{ ...filterset, rankingStandard: 4, focus: { type: "buddy", min_level: 2 } }
		];

		expect(buildPokestopDnfFilters(filter)).toStrictEqual([
			{
				incident_display_type: [9],
				contest_ranking_standard: [4],
				contest_focus: [{ type: "buddy", min_level: 2 }]
			}
		]);
	});
});

describe("buildStationDnfFilters", () => {
	const active = { station_active: true, battle_available: true };

	it("falls back to the active-with-battle-available clause when no filterset is enabled", () => {
		const filter = getDefaultStationFilter();
		filter.enabled = true;
		filter.maxBattle.enabled = true;
		filter.maxBattle.filters = [];

		expect(buildStationDnfFilters(filter)).toStrictEqual([active]);
	});

	it("translates isActive to the same clause", () => {
		const filter = getDefaultStationFilter();
		filter.enabled = true;
		filter.maxBattle.enabled = true;
		filter.maxBattle.filters = [{ ...filterset, isActive: true }];

		expect(buildStationDnfFilters(filter)).toStrictEqual([active]);
	});

	it("merges enabled bosses with the active clause but without form or bread-mode constraints", () => {
		const filter = getDefaultStationFilter();
		filter.enabled = true;
		filter.maxBattle.enabled = true;
		filter.maxBattle.filters = [
			{
				...filterset,
				bosses: [
					{ pokemon_id: 809, form: 0, bread_mode: 2 },
					{ pokemon_id: 25, form: 61, bread_mode: 1 }
				]
			},
			{ ...filterset, enabled: false, bosses: [{ pokemon_id: 6, form: 0, bread_mode: 2 }] }
		];

		expect(buildStationDnfFilters(filter)).toStrictEqual([
			{ ...active, battle_pokemon: [{ pokemon_id: 809 }, { pokemon_id: 25 }] }
		]);
	});

	it("translates hasGmax", () => {
		const filter = getDefaultStationFilter();
		filter.enabled = true;
		filter.maxBattle.enabled = true;
		filter.maxBattle.filters = [{ ...filterset, hasGmax: true }];

		expect(buildStationDnfFilters(filter)).toStrictEqual([{ ...active, stationed_gmax: true }]);
	});
});
