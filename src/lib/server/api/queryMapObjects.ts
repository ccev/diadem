import { query } from "@/lib/server/db/external/internalQuery";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type {
	AnyFilter,
	FilterGym,
	FilterGymPlain,
	FilterPokemon,
	FilterPokestop,
	FilterStation
} from "@/lib/features/filters/filters";
import { getMultiplePokemon } from "@/lib/server/api/golbatApi";
import type { MapData, MapObjectType } from "@/lib/types/mapObjectData/mapObjects";
import type { GolbatPokemonQuery } from "@/lib/server/api/queries";
import { LIMIT_GYM, LIMIT_POKEMON, LIMIT_STATION } from "@/lib/constants";
import { queryPokestops } from "@/lib/server/api/queryPokestops";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import { error } from "@sveltejs/kit";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { queryGyms } from "@/lib/server/api/queryGyms";

export type MapObjectResponse<Data extends MapData> = {
	examined: number;
	data: Data[];
};

export type WrappedMapObjectResponse<Data extends MapData> = {
	result: MapObjectResponse<Data>;
	error: number | undefined;
};

export type SqlExaminedResult = {
	examined: number
}[]

export async function queryMapObjects<Data extends MapData>(
	type: MapObjectType,
	bounds: Bounds,
	filter: AnyFilter | undefined
): Promise<WrappedMapObjectResponse<Data>> {
	let dbResponse: { result: Data[], error: number | undefined } | undefined = undefined
	let examinedResponse: { result: SqlExaminedResult, error: number | undefined } | undefined = undefined
	const enabled = filter === undefined || filter.enabled

	if (type === "pokemon" && enabled) {
		return await queryPokemon(bounds, filter as FilterPokemon | undefined);
	} else if (type === "gym" && enabled) {
		[ dbResponse, examinedResponse ] = await queryGyms(bounds, filter as FilterGym | undefined);
	} else if (type === "pokestop" && enabled) {
		[ dbResponse, examinedResponse ] = await queryPokestops(bounds, filter as FilterPokestop | undefined);
	} else if (type === "station" && enabled) {
		dbResponse = await queryStations(bounds, filter as FilterStation | undefined);
	} else {
		return { result: { examined: 0, data: [] }, error: 404 };
	}

	if (!dbResponse || dbResponse.error !== undefined) {
		return { result: { examined: 0, data: [] }, error: 500 };
	}

	let examined = dbResponse.result.length
	if (examinedResponse && examinedResponse.result[0] && examinedResponse.error === undefined) {
		examined = examinedResponse.result[0].examined
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
				pokemon: []
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
