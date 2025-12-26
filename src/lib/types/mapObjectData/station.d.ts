import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export type StationData = {
	id: string
	mapId: string
	type: MapObjectType.STATION
	lat: number
	lon: number
	name: string
	cell_id: bigint
	start_time: number
	end_time: number
	cooldown_complete: number
	is_battle_available: number
	is_inactive: number
	battle_level?: number
	battle_pokemon_id?: number
	battle_pokemon_form?: number
	battle_pokemon_costume?: number
	battle_pokemon_gender?: number
	battle_pokemon_alignment?: number
	battle_pokemon_bread_mode?: number
	battle_pokemon_move_1?: number
	battle_pokemon_move_2?: number
	updated: number
	battle_start?: number
	battle_end?: number
	total_stationed_pokemon?: number
	total_stationed_gmax?: number
	stationed_pokemon?: string
}
