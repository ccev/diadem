import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { FilterPokemon } from "@/lib/features/filters/filters";
import { getMultiplePokemon } from "@/lib/server/api/golbatApi";
import type { GolbatPokemonQuery, GolbatPokemonSpecies } from "@/lib/server/queryMapObjects/queries";
import { LIMIT_POKEMON } from "@/lib/constants";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import { getMasterPokemon } from "@/lib/services/masterfile";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { featureCollection, point, pointsWithinPolygon } from "@turf/turf";
import type { MapData, MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { error } from "@sveltejs/kit";
import type { MapObjectResponse } from "@/lib/server/api/queryMapObjects";

export async function queryPokemon(
	bounds: Bounds,
	filter: FilterPokemon | undefined,
	polygon: Feature<Polygon | MultiPolygon> | null
): Promise<MapObjectResponse<PokemonData>> {
	let golbatQueries: GolbatPokemonQuery[];
	const enabledFilters = filter?.filters?.filter((f) => f.enabled) ?? [];
	if (enabledFilters.length > 0) {
		golbatQueries = enabledFilters.map((filter) => {
			const query: GolbatPokemonQuery = {};
			if (filter.pokemon) {
				query.pokemon = [];

				for (const filterPokemon of filter.pokemon) {
					const pokemonQuery: GolbatPokemonSpecies = { id: filterPokemon.pokemon_id };

					// @ts-ignore backward compat; used to be form_id, now form
					const form = filterPokemon.form_id ?? filterPokemon?.form;

					if (form) {
						pokemonQuery.form = form;
						const masterPokemon = getMasterPokemon(filterPokemon.pokemon_id);

						if (masterPokemon && masterPokemon.defaultFormId) {
							// this is supposed to prevent issues with tracking normal forms (0 vs NORMAL form)
							// master pokemon may not be initialized on very early fetches, but that shouldn't be a problem
							if (form === 0 && masterPokemon.defaultFormId !== 0) {
								// when form is 0, add NORMAL form id
								query.pokemon.push({
									id: filterPokemon.pokemon_id,
									form: masterPokemon.defaultFormId
								});
							} else if (form === masterPokemon.defaultFormId && form !== 0) {
								// when form is NORMAL, add 0
								query.pokemon.push({
									id: filterPokemon.pokemon_id,
									form: 0
								});
							}
						}
					}

					query.pokemon.push(pokemonQuery);
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
		let filteredPokemon = result.pokemon;
		// golbat can only filter by bbox, so permissions-based polygon filters have to be applied here
		if (polygon) {
			const turfPoints = featureCollection(
				result.pokemon.map((p, i) => point([p.lon, p.lat], { index: i }))
			);
			const within = pointsWithinPolygon(turfPoints, polygon);
			const withinIndices = new Set(within.features.map((f) => f.properties?.index as number));
			filteredPokemon = result.pokemon.filter((_, i) => withinIndices.has(i));
		}
		const removedCount = result.pokemon.length - filteredPokemon.length;

		const data: MinMapObject<PokemonData>[] = filteredPokemon.map((p) => ({
			id: p.id,
			lat: p.lat,
			lon: p.lon,
			pokemon_id: p.pokemon_id,
			form: getNormalizedForm(p.pokemon_id, p.form),
			costume: p.costume,
			gender: p.gender,
			alignment: p.alignment,
			bread_mode: p.bread_mode,
			temp_evolution_id: p.temp_evolution_id,
			cp: p.cp,
			level: p.level,
			iv: p.iv,
			atk_iv: p.atk_iv,
			def_iv: p.def_iv,
			sta_iv: p.sta_iv,
			size: p.size,
			weather: p.weather,
			strong: p.strong,
			move_1: p.move_1,
			move_2: p.move_2,
			expire_timestamp: p.expire_timestamp,
			expire_timestamp_verified: p.expire_timestamp_verified,
			first_seen_timestamp: p.first_seen_timestamp,
			updated: p.updated,
			changed: p.changed,
			display_pokemon_id: p.display_pokemon_id,
			display_pokemon_form: getNormalizedForm(p.pokemon_id, p.display_pokemon_form),
			seen_type: p.seen_type,
			pvp: p.pvp
		}));

		return { data, examined: result.examined - removedCount }
	}
	error(500)
}
