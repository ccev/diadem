import type { StationData } from '@/lib/types/mapObjectData/station';
import { mPokemon } from '@/lib/services/ingameLocale';
import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
import * as m from '@/lib/paraglide/messages';
import { getActiveSearch } from "@/lib/features/activeSearch.svelte";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { FilterNest, FilterStation } from "@/lib/features/filters/filters";
import { defaultFilter, getUserSettings } from "@/lib/services/userSettings.svelte";
import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";
import { getActiveNestFilter } from "@/lib/utils/nestUtils";

export const STATION_SLOTS = 40;

export function getStationTitle(data: StationData) {
	if (data.battle_pokemon_id) return mPokemon(getStationPokemon(data))
	return data.name ?? m.pogo_station()
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
	} as FilterStation
}

export function getActiveStationFilter() {
	const activeSearch = getActiveSearch();
	if (activeSearch && activeSearch.mapObject === MapObjectType.STATION) {
		return activeSearch.filter as FilterStation;
	}
	return getUserSettings().filters.station;
}

export function shouldDisplayStation(station: StationData) {
	if (isCurrentSelectedOverwrite()) return true;

	const stationFilter = getActiveStationFilter();
	if (!stationFilter.enabled) return false;
	if (stationFilter.stationPlain.enabled) return true

	const maxBattleFilters = stationFilter.maxBattle.filters.filter((f) => f.enabled);
	if (maxBattleFilters.length === 0) return true;

	for (const filterset of maxBattleFilters) {
		if (
			filterset.bosses !== undefined &&
			filterset.bosses.find(
				(p) => p.pokemon_id === station.battle_pokemon_id
					&& p.form_id === station.battle_pokemon_form
					&& p.bread_mode === station.battle_pokemon_bread_mode
			)
		) {
			return true;
		}
	}

	return false;
}