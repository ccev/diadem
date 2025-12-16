import type { GymData } from '@/lib/types/mapObjectData/gym';
import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
import { currentTimestamp } from '@/lib/utils/currentTimestamp';
import { FORT_OUTDATED_SECONDS } from "@/lib/constants";
import { getUserSettings } from "@/lib/services/userSettings.svelte";

export type RaidFilterType = "level" | "boss"
export const GYM_SLOTS = 6;
export const RAID_LEVELS = [
	1,		// 1 star
	11,		// 1 star shadow
	3,		// 3 star
	13,		// 3 star shadow
	5,		// legendary
	15,		// legendary shadow
	6,		// mega
	7,		// mega legendary
	10,		// primal
	8,		// ultra beast
	// 16,		// 4 mega enhanced
	// 17,		// 5 mega enhanced
	9,		// elite
]

export function getRaidPokemon(gym: GymData): Partial<PokemonData> {
	return {
		pokemon_id: gym.raid_pokemon_id,
		form: gym.raid_pokemon_form,
		cp: gym.raid_pokemon_cp,
		gender: gym.raid_pokemon_gender,
		costume: gym.raid_pokemon_costume,
		temp_evolution_id: gym.raid_pokemon_evolution,
		alignment: gym.raid_pokemon_alignment,
		move_1: gym.raid_pokemon_move_1,
		move_2: gym.raid_pokemon_move_2
	};
}

export function isFortOutdated(updated?: number) {
	return (updated ?? 0) < currentTimestamp() - FORT_OUTDATED_SECONDS;
}

export function hasActiveRaid(data: GymData) {
	return (data.raid_end_timestamp ?? 0) > currentTimestamp()
}

export function isRaidHatched(data: GymData) {
	return (data.raid_battle_timestamp ?? 0) < currentTimestamp()
}

export function shouldDisplayRaid(data: GymData) {
	const timestamp = currentTimestamp()
	if ((data.raid_end_timestamp ?? 0) < timestamp || !data.raid_level) return false

	const gymFilters = getUserSettings().filters.gym
	if (!gymFilters.enabled || !gymFilters.raid.enabled) return false

	if (gymFilters.raid.filters === undefined) return true

	const filters = gymFilters.raid.filters.filter(f => f.enabled)
	if (filters.length === 0) return true

	const isEgg = !data.raid_pokemon_id

	for (const filter of filters) {
		if (!filter.levels?.includes(data.raid_level)) continue
		if (isEgg && !filter.showEggs) continue

		const hasBossFilter = filter.bosses && filter.bosses.length > 0
		if (!hasBossFilter) return true

		for (const boss of filter.bosses ?? []) {
			if (boss.pokemon_id === data.raid_pokemon_id && (!boss.form || boss.form === data.raid_pokemon_form)) {
				return true
			}
		}
	}

	return false
}