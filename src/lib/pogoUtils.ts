import type { Incident, PokestopData } from '@/lib/types/mapObjectData/pokestop';
import type { GymData } from '@/lib/types/mapObjectData/gym';
import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
import { currentTimestamp } from '@/lib/utils.svelte';
import { FORT_OUTDATED_SECONDS } from '@/lib/constants';
import { getIconGym } from '@/lib/uicons.svelte';
import type { StationData } from '@/lib/types/mapObjectData/station';

export const GYM_SLOTS = 6
export const CONTEST_SLOTS = 200
export const STATION_SLOTS = 40

export function isIncidentInvasion(incident: Incident) {
	return [1, 2, 3].includes(incident.display_type)
}

export function isIncidentKecleon(incident: Incident) {
	return incident.display_type === 8
}

export function isIncidentContest(incident: Incident) {
	return incident.display_type === 9
}

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
		move_2: gym.raid_pokemon_move_2,
	}
}

export function getStationPokemon(data: StationData): Partial<PokemonData> {
	return {
		pokemon_id: data.battle_pokemon_id,
		form: data.battle_pokemon_form,
		costume: data.battle_pokemon_costume,
		gender: data.battle_pokemon_gender,
		alignment: data.battle_pokemon_alignment,
		bread_mode: data.battle_pokemon_bread_mode,
		move_1: data.battle_pokemon_move_1,
		move_2: data.battle_pokemon_move_2
	}
}

export function isFortOutdated(updated?: number) {
	return (updated ?? 0) < (currentTimestamp() - FORT_OUTDATED_SECONDS)
}

export function hasFortActiveLure(data: Partial<PokestopData>) {
	return data.lure_id && data.lure_expire_timestamp && data.lure_expire_timestamp > currentTimestamp()
}

export function getPokemonSize(size: number) {
	return {
		1: "XXS",
		2: "XS",
		3: "M",
		4: "XL",
		5: "XXL"
	}[size] ?? "?"
}