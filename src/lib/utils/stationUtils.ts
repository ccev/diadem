import { getActiveSearch } from "@/lib/features/activeSearch.svelte";
import type { FilterStation } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import * as m from "@/lib/paraglide/messages";
import { mPokemon } from "@/lib/services/ingameLocale";
import { getMasterPokemon } from "@/lib/services/masterfile";
import { defaultFilter, getUserSettings } from "@/lib/services/userSettings.svelte";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";

export const STATION_SLOTS = 40;

export function getStationTitle(data: StationData) {
	if (data.battle_pokemon_id) return mPokemon(getStationPokemon(data));
	return data.name ?? m.pogo_station();
}

export function isMaxBattleActive(data: Partial<StationData>) {
	return Boolean(
		!data.is_inactive &&
			data.is_battle_available &&
			(data.start_time ?? 0) < currentTimestamp() &&
			(data.end_time ?? 0) > currentTimestamp()
	);
}

const MAX_BATTLE_FIELDS = [
	"start_time",
	"end_time",
	"is_battle_available",
	"battle_level",
	"battle_pokemon_id",
	"battle_pokemon_form",
	"battle_pokemon_costume",
	"battle_pokemon_gender",
	"battle_pokemon_alignment",
	"battle_pokemon_bread_mode",
	"battle_pokemon_move_1",
	"battle_pokemon_move_2",
	"battle_pokemon_stamina",
	"battle_pokemon_cp_multiplier"
] as const satisfies readonly (keyof StationData)[];

export function stripMaxBattleFields(data: Partial<StationData>) {
	for (const field of MAX_BATTLE_FIELDS) {
		delete data[field];
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
	};
}

export function getDefaultStationFilter() {
	return {
		category: "station",
		...defaultFilter(),
		stationPlain: { category: "stationPlain", ...defaultFilter() },
		maxBattle: { category: "maxBattle", ...defaultFilter() }
	} as FilterStation;
}

export function getActiveStationFilter() {
	const activeSearch = getActiveSearch();
	if (activeSearch && activeSearch.mapObject === MapObjectType.STATION) {
		return activeSearch.filter as FilterStation;
	}
	return getUserSettings().filters.station;
}

export function calculateMaxBattleCp(station: StationData) {
	if (
		!station.battle_pokemon_id ||
		!station.battle_pokemon_stamina ||
		!station.battle_pokemon_cp_multiplier
	)
		return;

	const pokemon = getMasterPokemon(station.battle_pokemon_id, station.battle_pokemon_form);

	if (!pokemon) return;

	const attack = pokemon.baseAtk + 15;
	const defense = pokemon.baseDef + 15;
	const stamina = station.battle_pokemon_stamina;
	const cpMultiplier = station.battle_pokemon_cp_multiplier;

	const cp = Math.floor((attack * cpMultiplier * Math.sqrt(defense * cpMultiplier * stamina)) / 10);
	return cp < 10 ? 10 : cp;
}
