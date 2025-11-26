import { query } from "@/lib/server/db/external/internalQuery";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type {
	AnyFilter,
	FilterGymPlain,
	FilterPokemon,
	FilterStation
} from "@/lib/features/filters/filters";
import { getMultiplePokemon } from "@/lib/server/api/golbatApi";
import type { MapData, MapObjectType } from "@/lib/types/mapObjectData/mapObjects";
import type { GolbatPokemonQuery } from "@/lib/server/api/queries";
import { LIMIT_GYM, LIMIT_POKEMON, LIMIT_STATION } from "@/lib/constants";
import { queryPokestops } from "@/lib/server/api/queryPokestops";

export async function queryMapObjects(type: MapObjectType, bounds: Bounds, filter: AnyFilter) {
	let result: { error: undefined | string; result: MapData[] } = {
		error: "Internal Error",
		result: []
	};

	if (type === "pokemon") {
		result = await queryPokemon(bounds, filter);
	} else if (type === "gym") {
		result = await queryGyms(bounds, filter);
	} else if (type === "pokestop") {
		result = await queryPokestops(bounds, filter);
	} else if (type === "station") {
		result = await queryStations(bounds, filter);
	}

	return result;
}

async function queryPokemon(bounds: Bounds, filter: FilterPokemon) {
	let golbatQuries: GolbatPokemonQuery[];
	const enabledFilters = filter.filters?.filter(f => f.enabled) ?? []
	if (enabledFilters.length > 0) {
		golbatQuries = enabledFilters
			.map((filter) => {
				const query: GolbatPokemonQuery = {};
				if (filter.pokemon) query.pokemon = filter.pokemon.map(p => {
					const obj: { id: number; form?: number } = { id: p.pokemon_id }
					if (p.form) obj.form = p.form

					return obj
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
		golbatQuries = [
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
		filters: golbatQuries
	};

	const response = await getMultiplePokemon(body);
	const results = await response.json();
	return { result: results, error: undefined };
}

async function queryGyms(bounds: Bounds, filter: FilterGymPlain) {
	return await query(
		"SELECT * FROM gym " +
			"WHERE lat BETWEEN ? AND ? " +
			"AND lon BETWEEN ? AND ? " +
			"AND deleted = 0 " +
			"LIMIT " + LIMIT_GYM,
		[bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]
	);
}

async function queryStations(bounds: Bounds, filter: FilterStation) {
	return await query(
		"SELECT * FROM station " +
			"WHERE lat BETWEEN ? AND ? " +
			"AND lon BETWEEN ? AND ? " +
			"AND end_time > UNIX_TIMESTAMP() " +
			"LIMIT " + LIMIT_STATION,
		[bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]
	);
}
