import { getSinglePokemon } from "@/lib/server/api/golbatApi";
import { query } from "@/lib/server/db/external/internalQuery";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint";

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
	} else if (type === MapObjectType.SPAWNPOINT) {
		result = await querySingleSpawnpoint(id);
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
	return await query<PokestopData>(
		"SELECT * FROM pokestop " +
			"LEFT JOIN incident ON incident.pokestop_id = pokestop.id " +
			"WHERE pokestop.id = ?",
		[id]
	);
}

async function querySingleStation(id: string) {
	return await query<StationData>("SELECT * FROM station " + "WHERE station.id = ?", [id]);
}

async function querySingleSpawnpoint(id: string) {
	return await query<SpawnpointData>("SELECT * FROM spawnpoint WHERE id = ?", [id]);
}
