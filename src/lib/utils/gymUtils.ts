import type { GymData } from '@/lib/types/mapObjectData/gym';
import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
import { currentTimestamp } from '@/lib/utils/currentTimestamp';
import { FORT_OUTDATED_SECONDS } from "@/lib/constants";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";

export type RaidFilterType = "level" | "boss"
export const GYM_SLOTS = 6;

export enum RaidLevel {
	STAR_1 = 1,
	SHADOW_STAR_1 = 11,
	STAR_3 = 3,
	SHADOW_STAR_3 = 13,
	LEGENDARY = 5,
	SHADOW_LEGENDARY = 15,
	MEGA = 6,
	MEGA_LEGENDARY = 7,
	PRIMAL = 10,
	ULTRA_BEAST = 8,
	ELITE = 9,
}
export const RAID_LEVELS = Object.values(RaidLevel).filter(v => typeof v === "number") as number[]

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

	// only active raids
	if ((data.raid_end_timestamp ?? 0) < timestamp || !data.raid_level) return false

	if (isCurrentSelectedOverwrite()) return true

	// general disabling
	const gymFilters = getUserSettings().filters.gym
	if (!gymFilters.enabled || !gymFilters.raid.enabled) return false

	// yes if not filtersets
	if (gymFilters.raid.filters === undefined) return true

	const filters = gymFilters.raid.filters.filter(f => f.enabled)
	if (filters.length === 0) return true

	const isEgg = !data.raid_pokemon_id

	for (const filter of filters) {
		if (filter.show) {
			// skip if hatch state shouldn't be shown
			if (filter.show.includes("egg") && !isEgg) continue
			if (filter.show.includes("boss") && isEgg) continue

			// return true if this is the only attribute
			if (!filter.levels && !filter.bosses) {
				if (filter.show.includes("egg") && isEgg) return true
				if (filter.show.includes("boss") && !isEgg) return true
			}
		}

		// respect level filters
		if (filter.levels?.includes(data.raid_level)) return true

		// check if boss should be shown
		for (const boss of filter.bosses ?? []) {
			if (boss.pokemon_id === data.raid_pokemon_id && (!boss.form || boss.form === data.raid_pokemon_form)) {
				return true
			}
		}
	}

	return false
}