import { FORT_OUTDATED_SECONDS } from "@/lib/constants";
import { getActiveSearch } from "@/lib/features/activeSearch.svelte";
import type { FilterGym } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { defaultFilter, getUserSettings } from "@/lib/services/userSettings.svelte";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";

export type RaidFilterType = "level" | "boss";
export const GYM_SLOTS = 6;

const RAID_FIELDS = [
	"raid_end_timestamp",
	"raid_spawn_timestamp",
	"raid_battle_timestamp",
	"raid_pokemon_id",
	"raid_level",
	"raid_pokemon_move_1",
	"raid_pokemon_move_2",
	"raid_pokemon_form",
	"raid_pokemon_cp",
	"raid_is_exclusive",
	"raid_pokemon_gender",
	"raid_pokemon_costume",
	"raid_pokemon_evolution",
	"raid_pokemon_alignment"
] as const satisfies readonly (keyof GymData)[];

export function stripRaidFields(data: Partial<GymData>) {
	for (const field of RAID_FIELDS) delete data[field];
}

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
	ELITE = 9
}
export const RAID_LEVELS = Object.values(RaidLevel).filter(
	(v) => typeof v === "number"
) as number[];

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
	return (data.raid_end_timestamp ?? 0) > currentTimestamp();
}

export function isRaidHatched(data: GymData) {
	return (data.raid_battle_timestamp ?? 0) < currentTimestamp();
}

export function getDefaultGymFilter(): FilterGym {
	return {
		category: "gym",
		...defaultFilter(true),
		gymPlain: { category: "gymPlain", ...defaultFilter(true) },
		raid: { category: "raid", ...defaultFilter(true) }
	};
}

export function getActiveGymFilter() {
	const activeSearch = getActiveSearch();
	if (activeSearch && activeSearch.mapObject === MapObjectType.GYM) {
		return activeSearch.filter as FilterGym;
	}
	return getUserSettings().filters.gym;
}
