import type { GymData } from '@/lib/types/mapObjectData/gym';
import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
import { currentTimestamp } from '@/lib/utils/currentTimestamp';
import { FORT_OUTDATED_SECONDS } from "@/lib/constants";

export const GYM_SLOTS = 6;

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