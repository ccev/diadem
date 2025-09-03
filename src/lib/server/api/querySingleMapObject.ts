import { getSinglePokemon } from "@/lib/server/api/golbatApi";
import { query } from "@/lib/server/db/external/internalQuery";
import type { MapObjectType } from "@/lib/types/mapObjectData/mapObjects";

export async function querySingleMapObject(type: MapObjectType, id: string, thisFetch: typeof fetch = fetch) {
	let result: { error: undefined | string; result: MapData[] } = {
		error: "Internal Error",
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
	return await query("SELECT * FROM gym " + "WHERE gym.id = ?", [id]);
}

async function querySinglePokestop(id: string) {
	return await query(
		"SELECT * FROM pokestop " +
			"LEFT JOIN incident ON incident.pokestop_id = pokestop.id " +
			"WHERE pokestop.id = ?",
		[id]
	);
}

async function querySingleStation(id: string) {
	return await query("SELECT * FROM station " + "WHERE station.id = ?", [id]);
}
