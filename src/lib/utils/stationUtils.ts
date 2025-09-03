import type { StationData } from '@/lib/types/mapObjectData/station';
import { mPokemon } from '@/lib/services/ingameLocale';
import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
import * as m from '@/lib/paraglide/messages';


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

export const STATION_SLOTS = 40;