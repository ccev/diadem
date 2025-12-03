import { getSinglePokemon } from "@/lib/server/api/golbatApi";
import { query } from "@/lib/server/db/external/internalQuery";
import type { MapData, MapObjectType } from "@/lib/types/mapObjectData/mapObjects";
import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';
import type { GymData } from '@/lib/types/mapObjectData/gym';
import type { StationData } from '@/lib/types/mapObjectData/station';

export async function querySingleMapObject(type: MapObjectType, id: string, thisFetch: typeof fetch = fetch) {
	let result: { error: undefined | number; result: MapData[] } = {
		error: 500,
		result: []
	};

	if (type === "pokemon") {
		result = await querySinglePokemon(id, thisFetch);
	} else if (type === "gym") {
		result = await querySingleGym(id);
	} else if (type === "pokestop") {
		result = await querySinglePokestop(id);
	} else if (type === "station") {
		result = await querySingleStation(id);
	}
	return result;
}

async function querySinglePokemon(id: string, thisFetch: typeof fetch) {
	const response = await getSinglePokemon(id, thisFetch);

	if (!response.ok)
		return {
			result: [],
			error: "Error"
		};

	const data = await response.json();

	return {
		result: [data],
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
