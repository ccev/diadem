import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { League } from "@/lib/utils/pokemonUtils";

export type PvpStats = {
	cap: number;
	cp: number;
	form: number;
	level: number;
	percentage: number;
	pokemon_id: number;
	rank: number;
	value: number;
	pokemon?: number;
	evolution?: number;
};

export type MinPokemon = {
	pokemon_id: number;
	form: number;
};

export type PokemonVisual = {
	pokemon_id: number;
	form: number;
	gender?: number;
	costume?: number;
	shiny?: boolean;
	temp_evolution_id?: number;
	alignment?: number;
	bread_mode?: number;
	background?: number;
};

export type PokemonData = {
	id: string;
	type: MapObjectType.POKEMON;
	mapId: string;
	pokestop_id?: string;
	spawn_id?: number;
	lat: number;
	lon: number;
	weight?: number;
	size?: number;
	height?: number;
	expire_timestamp?: number;
	updated?: number;
	move_1?: number;
	move_2?: number;
	cp?: number;
	atk_iv?: number;
	def_iv?: number;
	sta_iv?: number;
	iv?: number;
	level?: number;
	encounter_weather?: number;
	weather?: number;
	first_seen_timestamp?: number;
	changed?: number;
	cell_id?: number;
	expire_timestamp_verified?: boolean;
	display_pokemon_id?: number;
	display_pokemon_form?: number;
	is_ditto?: boolean;
	seen_type?: "wild" | "encounter" | "nearby_stop" | "nearby_cell" | "lure_wild" | "lure_encounter";
	username?: string;
	capture_1?: number;
	capture_2?: number;
	capture_3?: number;
	pvp?: {
		[League.LITTLE]?: PvpStats[];
		[League.GREAT]?: PvpStats[];
		[League.ULTRA]?: PvpStats[];
	};
	is_event?: number;
	strong?: number;
	/** Linked trainers (by name) this pokemon is shiny for */
	shiny_for?: string[];
	/** Same trainers as shiny_for, by linked_trainer id, for per-trainer filtersets */
	shiny_for_links?: string[];
	/** Linked trainers (by name) this pokemon has a background for */
	background_for?: string[];
} & PokemonVisual;
