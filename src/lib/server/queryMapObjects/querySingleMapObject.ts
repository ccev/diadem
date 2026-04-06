import { getSinglePokemon } from "@/lib/server/api/golbatApi";
import { query, queryJoined } from "@/lib/server/db/external/internalQuery";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { type MapData, MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import { processRawPokestop } from "@/lib/server/api/queryPokestops";
import {
	FIELDS_GYM,
	FIELDS_INCIDENT,
	FIELDS_NEST,
	FIELDS_POKESTOP,
	FIELDS_ROUTE,
	FIELDS_SPAWNPOINT,
	FIELDS_STATION,
	FIELDS_TAPPABLE
} from "@/lib/mapObjects/queryFields";
import { error } from "@sveltejs/kit";
import { makeMapObject } from "@/lib/mapObjects/makeMapObject";

export async function querySingleMapObject(
	type: MapObjectType,
	id: string,
	thisFetch: typeof fetch = fetch
): Promise<MinMapObject<MapData>[]> {
	if (type === MapObjectType.POKEMON) {
		const mon = await getSinglePokemon(id, thisFetch);
		if (mon) {
			return [mon];
		}
		return [];
	} else if (type === MapObjectType.GYM) {
		return await querySingleGym(id);
	} else if (type === MapObjectType.POKESTOP) {
		return await querySinglePokestop(id);
	} else if (type === MapObjectType.STATION) {
		return await querySingleStation(id);
	} else if (type === MapObjectType.NEST) {
		return await querySingleNest(id);
	} else if (type === MapObjectType.SPAWNPOINT) {
		return await querySingleSpawnpoint(id);
	} else if (type === MapObjectType.ROUTE) {
		return await querySingleRoute(id);
	} else if (type === MapObjectType.TAPPABLE) {
		return await querySingleTappable(id);
	}

	error(404);
}

export async function prepareSingleMapObject(
	type: MapObjectType,
	id: string,
	thisFetch: typeof fetch = fetch
) {
	const mapObjects = await querySingleMapObject(type, id, thisFetch)
	if (!mapObjects.length || !mapObjects[0]) return

	return makeMapObject(mapObjects[0], type) as MapData;
}

async function querySingleGym(id: string) {
	return await query<GymData[]>("SELECT " + FIELDS_GYM + " FROM gym WHERE gym.id = ?", [id]);
}

async function querySinglePokestop(id: string) {
	const result = await queryJoined<PokestopData[]>(
		"SELECT " +
			FIELDS_POKESTOP +
			"," +
			FIELDS_INCIDENT +
			" FROM pokestop " +
			"LEFT JOIN incident ON incident.pokestop_id = pokestop.id " +
			"WHERE pokestop.id = ?",
		[id]
	);
	if (result[0]) processRawPokestop(result[0]);
	return result;
}

async function querySingleStation(id: string) {
	return await query<StationData[]>(
		"SELECT " + FIELDS_STATION + " FROM station WHERE station.id = ?",
		[id]
	);
}

async function querySingleNest(id: string) {
	return await query<NestData[]>("SELECT " + FIELDS_NEST + " FROM nests WHERE nest_id = ?", [id]);
}

async function querySingleSpawnpoint(id: string) {
	return await query<SpawnpointData[]>(
		"SELECT " + FIELDS_SPAWNPOINT + " FROM spawnpoint WHERE id = ?",
		[id]
	);
}

async function querySingleRoute(id: string) {
	return await query<SpawnpointData[]>("SELECT " + FIELDS_ROUTE + " FROM route WHERE id = ?", [id]);
}

async function querySingleTappable(id: string) {
	return await query<SpawnpointData[]>(
		"SELECT " + FIELDS_TAPPABLE + " FROM tappable WHERE id = ?",
		[id]
	);
}
