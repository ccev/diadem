import type { FilterGym, FilterPokestop, FilterStation } from "@/lib/features/filters/filters";
import type { GolbatFortDnfFilter } from "@/lib/server/queryMapObjects/queries";
import {
	INCIDENT_DISPLAY_CONTEST,
	INCIDENT_DISPLAY_GOLD,
	INCIDENT_DISPLAY_KECLEON,
	INCIDENT_DISPLAYS_INVASION,
	RewardType
} from "@/lib/utils/pokestopUtils";

// Superset guards: broad enough that a matching object can never be missed;
// the local filter()/shouldDisplay* pass trims the excess.
const ALL_RAID_LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);
const ALL_LURE_IDS = [501, 502, 503, 504, 505, 506];
const ALL_QUEST_REWARD_TYPES = Object.values(RewardType).filter(
	(v): v is number => typeof v === "number" && v > 0
);
const AMOUNT_MAX = 10000;

function minMax(range: { min: number; max: number }) {
	return {
		min: Number.isFinite(range.min) ? range.min : 0,
		max: Number.isFinite(range.max) ? range.max : AMOUNT_MAX
	};
}

/** Returns [] = match all, clauses = send as filters, null = match nothing. */
export function buildGymDnfFilters(filter: FilterGym | undefined): GolbatFortDnfFilter[] | null {
	if (!filter || filter.gymPlain.enabled || !filter.raid.enabled) return [];

	const clauses: GolbatFortDnfFilter[] = [];
	for (const filterset of filter.raid.filters.filter((f) => f.enabled)) {
		// Mirrors queryGym.getFilterWhere: each SQL OR-branch is one clause, pushed
		// unconditionally — the SQL "boss" branch doesn't fold in `levels` either.
		// A clause with any raid_* field only matches gyms with an active raid.
		if (filterset.show?.includes("egg")) clauses.push({ raid_pokemon_id: [{ pokemon_id: 0 }] });
		if (filterset.show?.includes("boss")) {
			// DNF can't express "raid_pokemon_id != 0" (hatched); any-active-raid is a
			// proper superset of any-hatched-raid — local re-filter trims eggs back out.
			clauses.push({ raid_level: ALL_RAID_LEVELS });
		}
		if (filterset.levels?.length) clauses.push({ raid_level: filterset.levels });
		for (const boss of filterset.bosses ?? []) {
			// temp_evolution_id is not a DNF field: match by id only, re-filter locally
			clauses.push({ raid_pokemon_id: [{ pokemon_id: boss.pokemon_id }] });
		}
	}

	// SQL equivalent had a bare "raid_end_timestamp > now" when no clauses exist
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
			// SQL fell back to "has any active quest"
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
					// exact amount match is not expressible as a range safely — local re-filter
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
				// tasks-only filterset (title/target isn't a DNF field): any-quest superset
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
			// ranking_standard is not a DNF field — local re-filter
			if (filterset.focus.pokemon_id)
				clause.contest_pokemon = [{ pokemon_id: filterset.focus.pokemon_id }];
			if (filterset.focus.type_id) clause.contest_pokemon_type = [filterset.focus.type_id];
			clauses.push(clause);
		}
	}

	// SQL equivalent: "1 = 0"
	return clauses.length ? clauses : null;
}

export function buildStationDnfFilters(
	filter: FilterStation | undefined
): GolbatFortDnfFilter[] | null {
	if (!filter || filter.stationPlain.enabled || !filter.maxBattle.enabled) return [];

	const clauses: GolbatFortDnfFilter[] = [];
	for (const filterset of filter.maxBattle.filters.filter((f) => f.enabled)) {
		if (filterset.isActive) {
			clauses.push({ station_active: true });
			continue;
		}
		if (filterset.hasGmax) {
			clauses.push({ stationed_gmax: true });
			continue;
		}
		for (const boss of filterset.bosses ?? []) {
			// bread_mode is covered by battle_level in practice (gmax = level 6),
			// and re-checked locally either way — push id only
			clauses.push({ station_active: true, battle_pokemon: [{ pokemon_id: boss.pokemon_id }] });
		}
	}

	// SQL fallback: active battle with no boss constraint
	return clauses.length ? clauses : [{ station_active: true }];
}
