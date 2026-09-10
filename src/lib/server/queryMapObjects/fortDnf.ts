import type { FilterGym, FilterPokestop, FilterStation } from "@/lib/features/filters/filters";
import type { GolbatFortDnfFilter } from "@/lib/server/api/golbat/types";
import {
	ALL_LURE_IDS,
	INCIDENT_DISPLAY_CONTEST,
	INCIDENT_DISPLAY_GOLD,
	INCIDENT_DISPLAY_KECLEON,
	INCIDENT_DISPLAYS_INVASION,
	RewardType
} from "@/lib/utils/pokestopUtils";
import { RAID_LEVELS } from "@/lib/utils/gymUtils";

const ALL_QUEST_REWARD_TYPES = Object.values(RewardType).filter(
	(v): v is number => typeof v === "number" && v > 0
);
const INT16_MAX = 2 ** 15 - 1;

// Keep DNF clauses a superset of SQL; preparation normalizes forms before local filtering.
export function buildGymDnfFilters(filter: FilterGym | undefined): GolbatFortDnfFilter[] {
	if (!filter || filter.gymPlain.enabled || !filter.raid.enabled) return [];

	const clauses: GolbatFortDnfFilter[] = [];
	for (const filterset of filter.raid.filters.filter((f) => f.enabled)) {
		if (filterset.show?.includes("egg")) clauses.push({ raid_pokemon_id: [{ pokemon_id: 0 }] });
		if (filterset.show?.includes("boss")) {
			clauses.push({ raid_level: RAID_LEVELS });
		}
		if (filterset.levels?.length) clauses.push({ raid_level: filterset.levels });
		for (const boss of filterset.bosses ?? []) {
			const clause: GolbatFortDnfFilter = {
				raid_pokemon_id: [{ pokemon_id: boss.pokemon_id }]
			};
			if (boss.temp_evolution_id !== undefined) {
				clause.raid_temp_evolution_id = [boss.temp_evolution_id];
			}
			clauses.push(clause);
		}
	}

	return clauses.length ? clauses : [{ raid_level: RAID_LEVELS }];
}

export function buildPokestopDnfFilters(
	filter: FilterPokestop | undefined
): GolbatFortDnfFilter[] | null {
	if (!filter?.enabled || filter.pokestopPlain.enabled) return [];

	const clauses: GolbatFortDnfFilter[] = [];

	if (filter.lure.enabled) {
		const items = filter.lure.filters.filter((f) => f.enabled).flatMap((f) => f.items);
		clauses.push({ lure_id: items.length ? items : ALL_LURE_IDS });
	}

	if (filter.quest.enabled) {
		const questFilters = filter.quest.filters.filter((f) => f.enabled);
		if (!questFilters.length) {
			clauses.push({ quest_reward_type: ALL_QUEST_REWARD_TYPES });
		}
		for (const filterset of questFilters) {
			const rewardClauses: GolbatFortDnfFilter[] = [];

			for (const [type, range] of [
				[RewardType.STARDUST, filterset.stardust],
				[RewardType.POKECOINS, filterset.pokecoins],
				[RewardType.XP, filterset.xp]
			] as const) {
				if (!range) continue;
				rewardClauses.push({
					quest_reward_type: [type],
					// Golbat stores amounts as int16; check wider ranges locally instead of clamping.
					quest_reward_amount:
						Number.isInteger(range.min) &&
						Number.isInteger(range.max) &&
						range.min >= 0 &&
						range.min <= range.max &&
						range.max <= INT16_MAX
							? range
							: undefined
				});
			}
			if (filterset.pokemon?.length)
				rewardClauses.push({
					quest_reward_type: [RewardType.POKEMON],
					quest_reward_pokemon: filterset.pokemon.map((p) => ({ pokemon_id: p.pokemon_id }))
				});
			if (filterset.item?.length)
				rewardClauses.push({
					quest_reward_type: [RewardType.ITEM],
					quest_reward_item_id: filterset.item.map((item) => Number(item.id))
				});
			if (filterset.megaResource?.length)
				rewardClauses.push({
					quest_reward_type: [RewardType.MEGA_ENERGY, RewardType.TEMP_EVO_BRANCH_RESOURCE],
					quest_reward_pokemon: filterset.megaResource.map((reward) => ({
						pokemon_id: Number(reward.id)
					}))
				});
			const candy = [...(filterset.candy ?? []), ...(filterset.xlCandy ?? [])];
			if (candy.length)
				rewardClauses.push({
					quest_reward_type: [RewardType.CANDY, RewardType.XL_CANDY],
					quest_reward_pokemon: candy.map((reward) => ({ pokemon_id: Number(reward.id) }))
				});

			if (rewardClauses.length) {
				clauses.push(...rewardClauses);
			} else {
				clauses.push({ quest_reward_type: ALL_QUEST_REWARD_TYPES });
			}
		}
	}

	if (filter.invasion.enabled) {
		const invasionFilters = filter.invasion.filters.filter((f) => f.enabled);
		const characterIds = invasionFilters.flatMap((f) => f.characters ?? []);
		const hasUnsafeInvasionFilter = invasionFilters.some((f) => f.rewards?.length);
		const clause: GolbatFortDnfFilter = { incident_display_type: [...INCIDENT_DISPLAYS_INVASION] };
		if (characterIds.length && !hasUnsafeInvasionFilter) {
			clause.incident_character = characterIds;
		}
		clauses.push(clause);
	}

	if (filter.goldPokestop.enabled) clauses.push({ incident_display_type: [INCIDENT_DISPLAY_GOLD] });
	if (filter.kecleon.enabled) clauses.push({ incident_display_type: [INCIDENT_DISPLAY_KECLEON] });

	if (filter.contest.enabled) {
		const contestFilters = filter.contest.filters.filter((f) => f.enabled);
		if (!contestFilters.length) {
			clauses.push({ incident_display_type: [INCIDENT_DISPLAY_CONTEST] });
		}
		for (const filterset of contestFilters) {
			const clause: GolbatFortDnfFilter = {
				incident_display_type: [INCIDENT_DISPLAY_CONTEST],
				contest_ranking_standard: [filterset.rankingStandard]
			};
			if (filterset.focus.type === "pokemon") {
				clause.contest_pokemon = [{ pokemon_id: filterset.focus.pokemon_id }];
			} else if (filterset.focus.type === "type") {
				clause.contest_pokemon_type = [filterset.focus.pokemon_type_1];
			} else if (filterset.focus.type === "buddy") {
				clause.contest_focus = [filterset.focus];
			}
			clauses.push(clause);
		}
	}

	return clauses.length ? clauses : null;
}

export function buildStationDnfFilters(filter: FilterStation | undefined): GolbatFortDnfFilter[] {
	if (!filter || filter.stationPlain.enabled || !filter.maxBattle.enabled) return [];

	const active: GolbatFortDnfFilter = { station_active: true, battle_available: true };
	const clauses: GolbatFortDnfFilter[] = [];
	for (const filterset of filter.maxBattle.filters.filter((f) => f.enabled)) {
		if (filterset.isActive) {
			clauses.push({ ...active });
			continue;
		}
		if (filterset.hasGmax) {
			clauses.push({ ...active, stationed_gmax: true });
			continue;
		}
		if (filterset.bosses?.length) {
			clauses.push({
				...active,
				battle_pokemon: filterset.bosses.map((boss) => ({ pokemon_id: boss.pokemon_id }))
			});
		}
	}

	return clauses.length ? clauses : [{ ...active }];
}
