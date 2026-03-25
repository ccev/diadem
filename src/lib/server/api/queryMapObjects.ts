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
import { getMultiplePokemon } from "@/lib/server/api/golbatApi";
import type { GolbatPokemonQuery, GolbatPokemonSpecies } from "@/lib/server/api/queries";
import {
	LIMIT_NEST,
	LIMIT_POKEMON,
	LIMIT_ROUTE,
	LIMIT_SPAWNPOINT,
	LIMIT_STATION,
	LIMIT_TAPPABLE
} from "@/lib/constants";
import { queryPokestops } from "@/lib/server/api/queryPokestops";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { queryGyms } from "@/lib/server/api/queryGyms";
import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getMasterPokemon } from "@/lib/services/masterfile";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { pointsWithinPolygon, point, featureCollection } from "@turf/turf";
import { buildSpatialFilter } from "@/lib/server/api/spatialFilter";

export const FIELDS_NEST = [
	"nest_id as id",
	"lat",
	"lon",
	"name",
	"polygon",
	"spawnpoints",
	"m2",
	"active",
	"pokemon_id",
	"pokemon_form AS form",
	"pokemon_avg",
	"pokemon_ratio",
	"pokemon_count",
	"discarded",
	"updated"
].join(",")

export const FIELDS_TAPPABLE = [
	"id",
	"lat",
	"lon",
	"lat",
	"lon",
	"type as tappable_type",
	"pokemon_id",
	"item_id",
	"count",
	"expire_timestamp_verified",
	"expire_timestamp",
	"updated"
].join(",")

export const FIELDS_ROUTE = [
	"id",
	"start_lat as lat",
	"start_lon as lon",
	"name",
	"shortcode",
	"description",
	"distance_meters",
	"duration_seconds",
	"start_fort_id",
	"start_image",
	"start_lat",
	"start_lon",
	"end_fort_id",
	"end_image",
	"end_lat",
	"end_lon",
	"image",
	"image_border_color",
	"reversible",
	"tags",
	"type as route_type",
	"updated",
	"version",
	"waypoints"
].join(",")

export type MapObjectResponse<Data extends MapData> = {
	examined: number;
	data: Data[];
};

export type WrappedMapObjectResponse<Data extends MapData> = {
	result: MapObjectResponse<Data>;
	error: number | undefined;
};

export type SqlExaminedResult = {
	examined: number;
}[];

export async function queryMapObjects<Data extends MapData>(
	type: MapObjectType,
	bounds: Bounds,
	filter: AnyFilter | undefined,
	polygon: Feature<Polygon | MultiPolygon> | null = null
): Promise<WrappedMapObjectResponse<Data>> {
	let dbResponse: { result: Data[]; error: number | undefined } | undefined = undefined;
	let examinedResponse: { result: SqlExaminedResult; error: number | undefined } | undefined =
		undefined;
	const enabled = filter === undefined || filter.enabled;

	if (type === MapObjectType.POKEMON && enabled) {
		return await queryPokemon(bounds, filter as FilterPokemon | undefined, polygon);
	} else if (type === MapObjectType.GYM && enabled) {
		[dbResponse, examinedResponse] = await queryGyms(bounds, filter as FilterGym | undefined, polygon);
	} else if (type === MapObjectType.POKESTOP && enabled) {
		[dbResponse, examinedResponse] = await queryPokestops(
			bounds,
			filter as FilterPokestop | undefined,
			polygon
		);
	} else if (type === MapObjectType.STATION && enabled) {
		dbResponse = await queryStations(bounds, filter as FilterStation | undefined, polygon);
	} else if (type === MapObjectType.NEST && enabled) {
		dbResponse = await queryNests(bounds, filter as FilterNest | undefined, polygon);
	} else if (type === MapObjectType.SPAWNPOINT && enabled) {
		dbResponse = await querySpawnpoints(bounds, filter as FilterSpawnpoint | undefined, polygon);
	} else if (type === MapObjectType.ROUTE && enabled) {
		dbResponse = await queryRoutes(bounds, filter as FilterRoute | undefined, polygon);
	} else if (type === MapObjectType.TAPPABLE && enabled) {
		dbResponse = await queryTappables(bounds, filter as FilterTappable | undefined, polygon);
	} else {
		return { result: { examined: 0, data: [] }, error: 404 };
	}

	if (!dbResponse || dbResponse.error !== undefined) {
		return { result: { examined: 0, data: [] }, error: 500 };
	}

	let examined = dbResponse.result.length;
	if (examinedResponse && examinedResponse.result[0] && examinedResponse.error === undefined) {
		examined = examinedResponse.result[0].examined;
	}

	return { result: { examined, data: dbResponse?.result ?? [] }, error: undefined };
}

async function queryPokemon(
	bounds: Bounds,
	filter: FilterPokemon | undefined,
	polygon: Feature<Polygon | MultiPolygon> | null
): Promise<WrappedMapObjectResponse<PokemonData>> {
	let golbatQueries: GolbatPokemonQuery[];
	const enabledFilters = filter?.filters?.filter((f) => f.enabled) ?? [];
	if (enabledFilters.length > 0) {
		golbatQueries = enabledFilters.map((filter) => {
			const query: GolbatPokemonQuery = {};
			if (filter.pokemon) {
				query.pokemon = []

				for (const filterPokemon of filter.pokemon) {
					const pokemonQuery: GolbatPokemonSpecies = { id: filterPokemon.pokemon_id }

					// @ts-ignore backward compat; used to be form_id, now form
					const form = filterPokemon.form_id ?? filterPokemon?.form

					if (form) {
						pokemonQuery.form = form
						const masterPokemon = getMasterPokemon(filterPokemon.pokemon_id);

						if (masterPokemon && masterPokemon.defaultFormId) {
							// this is supposed to prevent issues with tracking normal forms (0 vs NORMAL form)
							// master pokemon may not be initialized on very early fetches, but that shouldn't be a problem
							if (form === 0 && masterPokemon.defaultFormId !== 0) {
								// when form is 0, add NORMAL form id
								query.pokemon.push({
									id: filterPokemon.pokemon_id,
									form: masterPokemon.defaultFormId
								})
							} else if (form === masterPokemon.defaultFormId && form !== 0) {
								// when form is NORMAL, add 0
								query.pokemon.push({
									id: filterPokemon.pokemon_id,
									form: 0
								});
							}
						}
					}

					query.pokemon.push(pokemonQuery)
				}
			}

			if (filter.iv) query.iv = filter.iv;
			if (filter.ivAtk) query.atk_iv = filter.ivAtk;
			if (filter.ivDef) query.def_iv = filter.ivDef;
			if (filter.ivSta) query.sta_iv = filter.ivSta;
			if (filter.level) query.level = filter.level;
			if (filter.cp) query.cp = filter.cp;
			if (filter.gender) query.gender = filter.gender;
			if (filter.size) query.size = filter.size;
			if (filter.pvpRankLittle) query.pvp_little = filter.pvpRankLittle;
			if (filter.pvpRankGreat) query.pvp_great = filter.pvpRankGreat;
			if (filter.pvpRankUltra) query.pvp_ultra = filter.pvpRankUltra;

			return query;
		});
	} else {
		golbatQueries = [
			{
				pokemon: [],
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
		limit: LIMIT_POKEMON,
		filters: golbatQueries
	};

	const result = await getMultiplePokemon(body);

	if (result) {
		let filteredPokemon = result.pokemon;
		if (polygon) {
			const turfPoints = featureCollection(
				result.pokemon.map((p, i) => point([p.lon, p.lat], { index: i }))
			);
			const within = pointsWithinPolygon(turfPoints, polygon);
			const withinIndices = new Set(within.features.map((f) => f.properties?.index as number));
			filteredPokemon = result.pokemon.filter((_, i) => withinIndices.has(i));
		}
		const removedCount = result.pokemon.length - filteredPokemon.length;

		for (const pokemon of filteredPokemon) {
			pokemon.shiny = false;
			pokemon.username = null;
			pokemon.form = getNormalizedForm(pokemon.pokemon_id, pokemon.form);
		}

		return {
			result: {
				examined: result.examined - removedCount,
				data: filteredPokemon
			},
			error: undefined
		};
	}

	return {
		result: { examined: 0, data: [] },
		error: 500
	};
}

async function queryStations(bounds: Bounds, filter: FilterStation | undefined, polygon: Feature<Polygon | MultiPolygon> | null) {
	const spatial = buildSpatialFilter(polygon, bounds);
	const { error, result } = await query<StationData[]>(
		"SELECT * FROM station " +
			"WHERE " + spatial.sql + " " +
			"AND end_time > UNIX_TIMESTAMP() " +
			"LIMIT " +
			LIMIT_STATION,
		spatial.values
	);

	for (const station of result) {
		station.battle_pokemon_form = getNormalizedForm(station.battle_pokemon_id, station.battle_pokemon_form)
	}
	return { error, result };
}

async function queryNests(bounds: Bounds, filter: FilterNest | undefined, polygon: Feature<Polygon | MultiPolygon> | null) {
	const spatialFilter = polygon
		? "MBRIntersects(polygon, ST_Envelope(LineString(Point(?, ?), Point(?, ?)))) AND ST_Intersects(ST_GeomFromGeoJSON(?), polygon)"
		: "MBRIntersects(polygon, ST_Envelope(LineString(Point(?, ?), Point(?, ?))))";
	const spatialValues: any[] = [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat];
	if (polygon) {
		spatialValues.push(JSON.stringify(polygon.geometry));
	}
	const { error, result } = await query<NestData[]>(
		"SELECT " + FIELDS_NEST +
		" FROM nests " +
		" WHERE " + spatialFilter +
		" AND active = 1 " +
		" AND pokemon_id IS NOT NULL " +
		" LIMIT " + LIMIT_NEST,
		spatialValues
	);
	// const { error, result } = await query<NestData[]>(
	// 	"SELECT  " +
	// 		FIELDS_NEST +
	// 		" FROM nests " +
	// 		"WHERE lat BETWEEN ? AND ? " +
	// 		"AND lon BETWEEN ? AND ? " +
	// 		"AND active = 1 " +
	// 		"AND pokemon_id IS NOT NULL " +
	// 		"LIMIT " +
	// 		LIMIT_NEST,
	// 	[bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]
	// );
	const defaultName = getServerConfig().golbat.defaultNestName ?? "Unknown Nest"
	for (const nest of result) {
		if (nest.name === defaultName) {
			nest.name = null;
		}
		nest.form = getNormalizedForm(nest.pokemon_id, nest.form)
	}
	return { error, result }
}

async function querySpawnpoints(bounds: Bounds, filter: FilterSpawnpoint | undefined, polygon: Feature<Polygon | MultiPolygon> | null) {
	const spatial = buildSpatialFilter(polygon, bounds);
	return await query<SpawnpointData[]>(
		"SELECT * " +
			"FROM spawnpoint " +
			"WHERE " + spatial.sql + " " +
			"LIMIT " +
			LIMIT_SPAWNPOINT,
		spatial.values
	);
}

async function queryRoutes(bounds: Bounds, filter: FilterRoute | undefined, polygon: Feature<Polygon | MultiPolygon> | null) {
	let sql: string;
	let values: any[];

	if (polygon) {
		const geom = JSON.stringify(polygon.geometry);
		sql = "(ST_Contains(ST_GeomFromGeoJSON(?), Point(start_lon, start_lat)) OR ST_Contains(ST_GeomFromGeoJSON(?), Point(end_lon, end_lat)))";
		values = [geom, geom];
	} else {
		sql = "((start_lat BETWEEN ? AND ? AND start_lon BETWEEN ? AND ?) OR (end_lat BETWEEN ? AND ? AND end_lon BETWEEN ? AND ?))";
		values = [bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon, bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon];
	}

	const { error, result } = await query<RouteData[]>(
		"SELECT " +
			FIELDS_ROUTE +
			" FROM route " +
			"WHERE " + sql + " " +
			"LIMIT " +
			LIMIT_ROUTE,
		values
	);
	return { error, result };
}

async function queryTappables(bounds: Bounds, filter: FilterTappable | undefined, polygon: Feature<Polygon | MultiPolygon> | null) {
	const spatial = buildSpatialFilter(polygon, bounds);
	return await query<TappableData[]>(
		"SELECT " +
			FIELDS_TAPPABLE +
			" FROM tappable " +
			"WHERE " + spatial.sql + " " +
			// "AND expire_timestamp > UNIX_TIMESTAMP() " +
			"LIMIT " +
			LIMIT_TAPPABLE,
		spatial.values
	);
}
