import { query } from "@/lib/server/db/external/internalQuery";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type {
	AnyFilter,
	FilterGym,
	FilterNest,
	FilterPokemon,
	FilterPokestop,
	FilterRoute,
	FilterSpawnpoint,
	FilterStation,
	FilterTappable
} from "@/lib/features/filters/filters";
import {
	LIMIT_NEST,
	LIMIT_ROUTE,
	LIMIT_SPAWNPOINT,
	LIMIT_STATION,
	LIMIT_TAPPABLE
} from "@/lib/constants";
import { queryPokestops } from "@/lib/server/api/queryPokestops";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { queryGyms } from "@/lib/server/api/queryGyms";
import { type MapData, MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { buildSpatialFilter } from "@/lib/server/api/spatialFilter";
import {
	FIELDS_NEST,
	FIELDS_ROUTE,
	FIELDS_SPAWNPOINT,
	FIELDS_STATION,
	FIELDS_TAPPABLE
} from "@/lib/mapObjects/queryFields";
import { queryPokemon } from "@/lib/server/queryMapObjects/queryPokemon";
import { error } from "@sveltejs/kit";

export type MapObjectResponse<Data extends MapData> = {
	examined: number;
	data: MinMapObject<Data>[];
};

export async function queryMapObjects<Data extends MapData>(
	type: MapObjectType,
	bounds: Bounds,
	filter: AnyFilter | undefined,
	polygon: Feature<Polygon | MultiPolygon> | null = null
): Promise<MapObjectResponse<Data>> {
	const enabled = filter === undefined || filter.enabled;

	if (!enabled) {
		return { examined: 0, data: [] };
	}

	let result: MapObjectResponse<Data>;

	if (type === MapObjectType.POKEMON) {
		result = (await queryPokemon(
			bounds,
			filter as FilterPokemon | undefined,
			polygon
		)) as MapObjectResponse<Data>;
	} else if (type === MapObjectType.GYM) {
		result = (await queryGyms(
			bounds,
			filter as FilterGym | undefined,
			polygon
		)) as MapObjectResponse<Data>;
	} else if (type === MapObjectType.POKESTOP) {
		result = (await queryPokestops(
			bounds,
			filter as FilterPokestop | undefined,
			polygon
		)) as MapObjectResponse<Data>;
	} else if (type === MapObjectType.STATION) {
		result = (await queryStations(
			bounds,
			filter as FilterStation | undefined,
			polygon
		)) as MapObjectResponse<Data>;
	} else if (type === MapObjectType.NEST) {
		result = (await queryNests(
			bounds,
			filter as FilterNest | undefined,
			polygon
		)) as MapObjectResponse<Data>;
	} else if (type === MapObjectType.SPAWNPOINT) {
		result = (await querySpawnpoints(
			bounds,
			filter as FilterSpawnpoint | undefined,
			polygon
		)) as MapObjectResponse<Data>;
	} else if (type === MapObjectType.ROUTE) {
		result = (await queryRoutes(
			bounds,
			filter as FilterRoute | undefined,
			polygon
		)) as MapObjectResponse<Data>;
	} else if (type === MapObjectType.TAPPABLE) {
		result = (await queryTappables(
			bounds,
			filter as FilterTappable | undefined,
			polygon
		)) as MapObjectResponse<Data>;
	} else {
		error(404);
	}

	return result;
}

async function queryStations(
	bounds: Bounds,
	filter: FilterStation | undefined,
	polygon: Feature<Polygon | MultiPolygon> | null
): Promise<MapObjectResponse<StationData>> {
	const spatial = buildSpatialFilter(polygon, bounds);
	const result = await query<MinMapObject<StationData>[]>(
		"SELECT " +
			FIELDS_STATION +
			" FROM station " +
			"WHERE " +
			spatial.sql +
			" " +
			"AND end_time > UNIX_TIMESTAMP() " +
			"LIMIT " +
			LIMIT_STATION,
		spatial.values
	);

	for (const station of result) {
		station.battle_pokemon_form = getNormalizedForm(
			station.battle_pokemon_id,
			station.battle_pokemon_form
		);
	}
	return { data: result, examined: result.length };
}

async function queryNests(
	bounds: Bounds,
	filter: FilterNest | undefined,
	polygon: Feature<Polygon | MultiPolygon> | null
): Promise<MapObjectResponse<NestData>> {
	const spatialFilter = polygon
		? "MBRIntersects(polygon, ST_Envelope(LineString(Point(?, ?), Point(?, ?)))) AND ST_Intersects(ST_GeomFromGeoJSON(?), polygon)"
		: "MBRIntersects(polygon, ST_Envelope(LineString(Point(?, ?), Point(?, ?))))";
	const spatialValues: any[] = [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat];
	if (polygon) {
		spatialValues.push(JSON.stringify(polygon.geometry));
	}
	const result = await query<MinMapObject<NestData>[]>(
		"SELECT " +
			FIELDS_NEST +
			" FROM nests " +
			" WHERE " +
			spatialFilter +
			" AND active = 1 " +
			" AND pokemon_id IS NOT NULL " +
			" LIMIT " +
			LIMIT_NEST,
		spatialValues
	);
	const defaultName = getServerConfig().golbat.defaultNestName ?? "Unknown Nest";
	for (const nest of result) {
		if (nest.name === defaultName) {
			nest.name = null;
		}
		nest.form = getNormalizedForm(nest.pokemon_id, nest.form);
	}
	return { data: result, examined: result.length };
}

async function querySpawnpoints(
	bounds: Bounds,
	filter: FilterSpawnpoint | undefined,
	polygon: Feature<Polygon | MultiPolygon> | null
): Promise<MapObjectResponse<SpawnpointData>> {
	const spatial = buildSpatialFilter(polygon, bounds);
	const result = await query<MinMapObject<SpawnpointData>[]>(
		"SELECT " +
			FIELDS_SPAWNPOINT +
			" FROM spawnpoint " +
			"WHERE " +
			spatial.sql +
			" " +
			"LIMIT " +
			LIMIT_SPAWNPOINT,
		spatial.values
	);
	return { data: result, examined: result.length };
}

async function queryRoutes(
	bounds: Bounds,
	filter: FilterRoute | undefined,
	polygon: Feature<Polygon | MultiPolygon> | null
): Promise<MapObjectResponse<RouteData>> {
	const spatial = buildSpatialFilter(polygon, bounds);
	const result = await query<MinMapObject<RouteData>[]>(
		"SELECT  " +
			FIELDS_ROUTE +
			" FROM route " +
			"WHERE " +
			spatial.sql +
			" " +
			"LIMIT " +
			LIMIT_ROUTE,
		spatial.values
	);
	return { data: result, examined: result.length };
}

async function queryTappables(
	bounds: Bounds,
	filter: FilterTappable | undefined,
	polygon: Feature<Polygon | MultiPolygon> | null
): Promise<MapObjectResponse<TappableData>> {
	const spatial = buildSpatialFilter(polygon, bounds);
	const result = await query<MinMapObject<TappableData>[]>(
		"SELECT " +
			FIELDS_TAPPABLE +
			" FROM tappable " +
			"WHERE " +
			spatial.sql +
			" " +
			"LIMIT " +
			LIMIT_TAPPABLE,
		spatial.values
	);
	return { data: result, examined: result.length };
}
