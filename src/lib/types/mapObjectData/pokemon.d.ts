import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export type PvpStats = {
	cap: number
	cp: number
	form: number
	level: number
	percentage: number
	pokemon: number
	rank: number
	value: number
}

export type PokemonData = {
	id: string;
	type: MapObjectType.POKEMON
	mapId: string
	pokestop_id: string | null;
	spawn_id: number | null;
	lat: number;
	lon: number;
	weight: number | null;
	size: number | null;
	height: number | null;
	expire_timestamp: number | null;
	updated: number | null;
	pokemon_id: number;
	move_1: number | null;
	move_2: number | null;
	gender: number | null;
	cp: number | null;
	atk_iv: number | null;
	def_iv: number | null;
	sta_iv: number | null;
	iv: number | null;
	form: number | null;
	level: number | null;
	encounter_weather: number;
	weather: number | null;
	costume: number | null;
	first_seen_timestamp: number;
	changed: number;
	cellId: number | null;
	expire_timestamp_verified: boolean;
	display_pokemon_id: number | null;
	is_ditto: boolean;
	seen_type: 'wild' | 'encounter' | 'nearby_stop'| 'nearby_cell' | 'lure_wild' | 'lure_encounter' | null;
	shiny: boolean | null;
	username: string | null;
	capture1: number | null;
	capture2: number | null;
	capture3: number | null;
	pvp: {
		little?: PvpStats[]
		great?: PvpStats[]
		ultra?: PvpStats[]
	}
	is_event: number;
	temp_evolution_id?: number;
	alignment?: number;
	bread_mode?: number;
	strong: number | null
};
