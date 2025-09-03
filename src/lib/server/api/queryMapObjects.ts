import { query } from "@/lib/server/db/external/internalQuery";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type {
	AllFilters,
	FilterGymPlain,
	FilterPokemon,
	FilterPokestopPlain,
	FilterStationMajor
} from "@/lib/features/filters/filters";
import { getMultiplePokemon } from "@/lib/server/api/golbatApi";
import type { MapData, MapObjectType } from "@/lib/types/mapObjectData/mapObjects";

export async function queryMapObjects(type: MapObjectType, bounds: Bounds, filter: AllFilters) {
	let result: { error: undefined | string, result: MapData[] } = { error: "Internal Error", result: [] }

	if (type === "pokemon") {
		result = await queryPokemon(bounds, filter)
	} else if (type === "gym") {
		result = await queryGyms(bounds, filter)
	} else if (type === "pokestop") {
		result = await queryPokestops(bounds, filter)
	} else if (type === "station") {
		result = await queryStations(bounds, filter)
	}

	return result
}

async function queryPokemon(bounds: Bounds, filter: FilterPokemon) {
	let golbatFilters = [
		{
			pokemon: []
		}
	];

	if (filter.type === "filtered") {
		golbatFilters = [
			{
				pokemon: [],
				iv: { min: 100, max: 100 }
			}
		];
	}

	const body = {
		min: {
			latitude: bounds.minLat,
			longitude: bounds.minLon
		},
		max: {
			latitude: bounds.maxLat,
			longitude: bounds.maxLon
		},
		limit: 500000,
		filters: golbatFilters
	};

	const response = await getMultiplePokemon(body);
	const results = await response.json();
	return { result: results, error: undefined };
}

async function queryPokestops(bounds: Bounds, filter: FilterPokestopPlain) {
	return await query(
		"SELECT * FROM pokestop " +
			"LEFT JOIN incident ON incident.pokestop_id = pokestop.id " +
			"WHERE lat BETWEEN ? AND ? " +
			"AND lon BETWEEN ? AND ? " +
			"AND deleted = 0 " +
			"LIMIT 10000",
		[bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]
	);
}

async function queryGyms(bounds: Bounds, filter: FilterGymPlain) {
	return await query(
		"SELECT * FROM gym " +
			"WHERE lat BETWEEN ? AND ? " +
			"AND lon BETWEEN ? AND ? " +
			"AND deleted = 0 " +
			"LIMIT 10000",
		[bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]
	);
}

async function queryStations(bounds: Bounds, filter: FilterStationMajor) {
	return await query(
		"SELECT * FROM station " +
			"WHERE lat BETWEEN ? AND ? " +
			"AND lon BETWEEN ? AND ? " +
			"AND end_time > UNIX_TIMESTAMP() " +
			"LIMIT 10000",
		[bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]
	);
}
