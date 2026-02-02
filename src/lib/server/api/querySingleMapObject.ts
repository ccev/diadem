import { getSinglePokemon } from "@/lib/server/api/golbatApi";
import { query } from "@/lib/server/db/external/internalQuery";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import { FIELDS_NEST, FIELDS_ROUTE, FIELDS_TAPPABLE } from "@/lib/server/api/queryMapObjects";
import { processRawPokestop } from "@/lib/server/api/queryPokestops";

export async function querySingleMapObject(
	type: MapObjectType,
	id: string,
	thisFetch: typeof fetch = fetch
) {
	let result: { error: undefined | number; result: MapData[] } = {
		error: 500,
		result: []
	};

	if (type === MapObjectType.POKEMON) {
		result = await querySinglePokemon(id, thisFetch);
	} else if (type === MapObjectType.GYM) {
		result = await querySingleGym(id);
	} else if (type === MapObjectType.POKESTOP) {
		result = await querySinglePokestop(id);
	} else if (type === MapObjectType.STATION) {
		result = await querySingleStation(id);
	} else if (type === MapObjectType.NEST) {
		result = await querySingleNest(id);
	} else if (type === MapObjectType.SPAWNPOINT) {
		result = await querySingleSpawnpoint(id);
	} else if (type === MapObjectType.ROUTE) {
		result = await querySingleRoute(id);
	} else if (type === MapObjectType.TAPPABLE) {
		result = await querySingleTappable(id);
	}

	return result;
}

async function querySinglePokemon(id: string, thisFetch: typeof fetch) {
	const response = await getSinglePokemon(id, thisFetch);

	if (!response)
		return {
			result: [],
			error: "Error"
		};
	return {
		result: [response],
		error: null
	};
}

async function querySingleGym(id: string) {
	return await query<GymData>("SELECT * FROM gym " + "WHERE gym.id = ?", [id]);
}

async function querySinglePokestop(id: string) {
	const result = await query<PokestopData>(
		"SELECT * FROM pokestop " +
			"LEFT JOIN incident ON incident.pokestop_id = pokestop.id " +
			"WHERE pokestop.id = ?",
		[id]
	);
	if (result.result) processRawPokestop(result.result)
	return result
}

async function querySingleStation(id: string) {
	return await query<StationData>("SELECT * FROM station " + "WHERE station.id = ?", [id]);
}

async function querySingleNest(id: string) {
	return await query<NestData>("SELECT " + FIELDS_NEST + " FROM nests WHERE nest_id = ?", [id]);
}

async function querySingleSpawnpoint(id: string) {
	return await query<SpawnpointData>("SELECT * FROM spawnpoint WHERE id = ?", [id]);
}

async function querySingleRoute(id: string) {
	return await query<SpawnpointData>("SELECT " + FIELDS_ROUTE + " FROM route WHERE id = ?", [id]);
}

async function querySingleTappable(id: string) {
	return await query<SpawnpointData>("SELECT " + FIELDS_TAPPABLE + " FROM tappable WHERE id = ?", [
		id
	]);
}
