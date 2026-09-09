import type { FilterGym, FilterPokestop, FilterStation } from "@/lib/features/filters/filters";
import type { GolbatFortDnfFilter } from "@/lib/server/queryMapObjects/queries";
import {
	INCIDENT_DISPLAY_CONTEST,
	INCIDENT_DISPLAY_GOLD,
	INCIDENT_DISPLAY_KECLEON,
	INCIDENT_DISPLAYS_INVASION,
	RewardType
} from "@/lib/utils/pokestopUtils";

const ALL_RAID_LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);
const ALL_LURE_IDS = [501, 502, 503, 504, 505, 506];
const ALL_QUEST_REWARD_TYPES = Object.values(RewardType).filter(
	(v): v is number => typeof v === "number" && v > 0
);
const INT16_MIN = -(2 ** 15);
const INT16_MAX = 2 ** 15 - 1;

function minMax(range: { min: number; max: number }) {
	return {
		min: Math.max(INT16_MIN, Math.min(INT16_MAX, Number.isFinite(range.min) ? range.min : 0)),
		max: Math.max(
			INT16_MIN,
			Math.min(INT16_MAX, Number.isFinite(range.max) ? range.max : INT16_MAX)
		)
	};
}

export function buildGymDnfFilters(filter: FilterGym | undefined): GolbatFortDnfFilter[] {
	if (!filter || filter.gymPlain.enabled || !filter.raid.enabled) return [];

	const clauses: GolbatFortDnfFilter[] = [];
	for (const filterset of filter.raid.filters.filter((f) => f.enabled)) {
		if (filterset.show?.includes("egg")) clauses.push({ raid_pokemon_id: [{ pokemon_id: 0 }] });
		if (filterset.show?.includes("boss")) {
			clauses.push({ raid_level: ALL_RAID_LEVELS });
		}
		if (filterset.levels?.length) clauses.push({ raid_level: filterset.levels });
		for (const boss of filterset.bosses ?? []) {
			const clause: GolbatFortDnfFilter = {
				raid_pokemon_id: [{ pokemon_id: boss.pokemon_id, form: boss.form || undefined }]
			};
			if (boss.temp_evolution_id !== undefined) {
				clause.raid_temp_evolution_id = [boss.temp_evolution_id];
			}
			clauses.push(clause);
		}
	}

	return clauses.length ? clauses : [{ raid_level: ALL_RAID_LEVELS }];
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

			if (filterset.stardust)
				rewardClauses.push({
					quest_reward_type: [RewardType.STARDUST],
					quest_reward_amount: minMax(filterset.stardust)
				});
			if (filterset.pokecoins)
				rewardClauses.push({
					quest_reward_type: [RewardType.POKECOINS],
					quest_reward_amount: minMax(filterset.pokecoins)
				});
			if (filterset.xp)
				rewardClauses.push({
					quest_reward_type: [RewardType.XP],
					quest_reward_amount: minMax(filterset.xp)
				});
			if (filterset.pokemon?.length)
				rewardClauses.push({
					quest_reward_type: [RewardType.POKEMON],
					quest_reward_pokemon: filterset.pokemon.map((p) => ({ pokemon_id: p.pokemon_id }))
				});
			for (const item of filterset.item ?? [])
				rewardClauses.push({
					quest_reward_type: [RewardType.ITEM],
					quest_reward_item_id: [Number(item.id)]
				});
			for (const reward of filterset.megaResource ?? [])
				rewardClauses.push({
					quest_reward_type: [RewardType.MEGA_ENERGY, RewardType.TEMP_EVO_BRANCH_RESOURCE],
					quest_reward_pokemon: [{ pokemon_id: Number(reward.id) }]
				});
			for (const reward of [...(filterset.candy ?? []), ...(filterset.xlCandy ?? [])])
				rewardClauses.push({
					quest_reward_type: [RewardType.CANDY, RewardType.XL_CANDY],
					quest_reward_pokemon: [{ pokemon_id: Number(reward.id) }]
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
		if (invasionFilters.length > 0 && characterIds.length > 0 && !hasUnsafeInvasionFilter) {
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
			const clause: GolbatFortDnfFilter = { incident_display_type: [INCIDENT_DISPLAY_CONTEST] };
			clause.contest_ranking_standard = [filterset.rankingStandard];
			if (filterset.focus.type === "pokemon") {
				clause.contest_pokemon = [
					{
						pokemon_id: filterset.focus.pokemon_id,
						form: filterset.focus.pokemon_form || undefined
					}
				];
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

	const clauses: GolbatFortDnfFilter[] = [];
	for (const filterset of filter.maxBattle.filters.filter((f) => f.enabled)) {
		if (filterset.isActive) {
			clauses.push({ station_active: true });
			continue;
		}
		if (filterset.hasGmax) {
			clauses.push({ station_active: true, stationed_gmax: true });
			continue;
		}
		for (const boss of filterset.bosses ?? []) {
			clauses.push({
				station_active: true,
				battle_pokemon: [{ pokemon_id: boss.pokemon_id, form: boss.form || undefined }]
			});
		}
	}

	return clauses.length ? clauses : [{ station_active: true }];
}
