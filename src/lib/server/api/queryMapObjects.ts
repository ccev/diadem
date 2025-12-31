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
import type { GolbatPokemonQuery } from "@/lib/server/api/queries";
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
	"pokemon_form",
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
	filter: AnyFilter | undefined
): Promise<WrappedMapObjectResponse<Data>> {
	let dbResponse: { result: Data[]; error: number | undefined } | undefined = undefined;
	let examinedResponse: { result: SqlExaminedResult; error: number | undefined } | undefined =
		undefined;
	const enabled = filter === undefined || filter.enabled;

	if (type === MapObjectType.POKEMON && enabled) {
		return await queryPokemon(bounds, filter as FilterPokemon | undefined);
	} else if (type === MapObjectType.GYM && enabled) {
		[dbResponse, examinedResponse] = await queryGyms(bounds, filter as FilterGym | undefined);
	} else if (type === MapObjectType.POKESTOP && enabled) {
		[dbResponse, examinedResponse] = await queryPokestops(
			bounds,
			filter as FilterPokestop | undefined
		);
	} else if (type === MapObjectType.STATION && enabled) {
		dbResponse = await queryStations(bounds, filter as FilterStation | undefined);
	} else if (type === MapObjectType.NEST && enabled) {
		dbResponse = await queryNests(bounds, filter as FilterNest | undefined);
	} else if (type === MapObjectType.SPAWNPOINT && enabled) {
		dbResponse = await querySpawnpoints(bounds, filter as FilterSpawnpoint | undefined);
	} else if (type === MapObjectType.ROUTE && enabled) {
		dbResponse = await queryRoutes(bounds, filter as FilterRoute | undefined);
	} else if (type === MapObjectType.TAPPABLE && enabled) {
		dbResponse = await queryTappables(bounds, filter as FilterTappable | undefined);
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
	filter: FilterPokemon | undefined
): Promise<WrappedMapObjectResponse<PokemonData>> {
	let golbatQueries: GolbatPokemonQuery[];
	const enabledFilters = filter?.filters?.filter((f) => f.enabled) ?? [];
	if (enabledFilters.length > 0) {
		golbatQueries = enabledFilters.map((filter) => {
			const query: GolbatPokemonQuery = {};
			if (filter.pokemon)
				query.pokemon = filter.pokemon.map((p) => {
					const obj: { id: number; form?: number } = { id: p.pokemon_id };
					if (p.form) obj.form = p.form;

					return obj;
				});
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
		for (const pokemon of result.pokemon) {
			pokemon.shiny = false;
			pokemon.username = null;
		}
		return {
			result: {
				examined: result.examined,
				data: result.pokemon
			},
			error: undefined
		};
	}

	return {
		result: { examined: 0, data: [] },
		error: 500
	};
}

async function queryStations(bounds: Bounds, filter: FilterStation | undefined) {
	return await query<StationData[]>(
		"SELECT * FROM station " +
			"WHERE lat BETWEEN ? AND ? " +
			"AND lon BETWEEN ? AND ? " +
			"AND end_time > UNIX_TIMESTAMP() " +
			"LIMIT " +
			LIMIT_STATION,
		[bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]
	);
}

async function queryNests(bounds: Bounds, filter: FilterNest | undefined) {
	const { error, result } = await query<NestData[]>(
		"SELECT  " +
			FIELDS_NEST +
			" FROM nests " +
			"WHERE lat BETWEEN ? AND ? " +
			"AND lon BETWEEN ? AND ? " +
			"AND active = 1 " +
			"AND pokemon_id IS NOT NULL " +
			"LIMIT " +
			LIMIT_NEST,
		[bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]
	);
	const defaultName = getServerConfig().golbat.defaultNestName ?? "Unknown Nest"
	for (const nest of result) {
		if (nest.name === defaultName) {
			nest.name = null;
		}
	}
	return { error, result }
}

async function querySpawnpoints(bounds: Bounds, filter: FilterSpawnpoint | undefined) {
	return await query<SpawnpointData[]>(
		"SELECT * " +
			"FROM spawnpoint " +
			"WHERE lat BETWEEN ? AND ? " +
			"AND lon BETWEEN ? AND ? " +
			"LIMIT " +
			LIMIT_SPAWNPOINT,
		[bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]
	);
}

async function queryRoutes(bounds: Bounds, filter: FilterRoute | undefined) {
	return await query<RouteData[]>(
		"SELECT  " +
			FIELDS_ROUTE +
			" FROM route " +
			"WHERE lat BETWEEN ? AND ? " +
			"AND lon BETWEEN ? AND ? " +
			"LIMIT " +
			LIMIT_ROUTE,
		[bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]
	);
}

async function queryTappables(bounds: Bounds, filter: FilterTappable | undefined) {
	return await query<TappableData[]>(
		"SELECT " +
			FIELDS_TAPPABLE +
			" FROM tappable " +
			"WHERE lat BETWEEN ? AND ? " +
			"AND lon BETWEEN ? AND ? " +
			// "AND expire_timestamp > UNIX_TIMESTAMP() " +
			"LIMIT " +
			LIMIT_TAPPABLE,
		[bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]
	);
}
