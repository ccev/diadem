import {
	MapObjectQuery,
	type MapObjectResponse
} from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { PokemonData, PvpStats } from "@/lib/types/mapObjectData/pokemon";
import type { FilterPokemon } from "@/lib/features/filters/filters";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { getMultiplePokemon, getSinglePokemon } from "@/lib/server/api/golbatApi";
import type {
	GolbatPokemonQuery,
	GolbatPokemonSpecies
} from "@/lib/server/queryMapObjects/queries";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { getMasterPokemon } from "@/lib/services/masterfile";
import {
	getNormalizedForm,
	showGreat,
	showLittle,
	showPvp,
	showUltra
} from "@/lib/utils/pokemonUtils";
import { booleanPointInPolygon, featureCollection, point, pointsWithinPolygon } from "@turf/turf";
import { error } from "@sveltejs/kit";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { getLogger } from "@/lib/utils/logger";
import { round } from "@/lib/utils/numberFormat";

export class PokemonQuery extends MapObjectQuery<PokemonData, FilterPokemon> {
	protected readonly type = MapObjectType.POKEMON;
	protected readonly limit = requestLimits[MapObjectType.POKEMON];

	async query(
		bounds: Bounds,
		filter: FilterPokemon | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number
	): Promise<MapObjectResponse<MinMapObject<PokemonData>>> {
		const golbatQueries = this.buildGolbatQueries(filter);

		const actualLimit = Math.min(limit ?? this.limit, this.limit);

		const body = {
			min: { latitude: bounds.minLat, longitude: bounds.minLon },
			max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
			limit: actualLimit,
			filters: golbatQueries
		};

		const result = await getMultiplePokemon(body);

		if (result) {
			const data: MinMapObject<PokemonData>[] = [];
			let examined = result.examined;

			for (const p of result.pokemon) {
				if (since && (p.updated ?? 0) < since) {
					continue;
				}
				if (polygon && !booleanPointInPolygon(point([p.lon, p.lat]), polygon)) {
					examined -= 1;
					continue;
				}

				const pokemon = {
					id: p.id,
					lat: round(p.lat, 6),
					lon: round(p.lon, 6),
					pokemon_id: p.pokemon_id,
					form: getNormalizedForm(p.pokemon_id, p.form),
					costume: p.costume,
					gender: p.gender,
					alignment: p.alignment,
					bread_mode: p.bread_mode,
					temp_evolution_id: p.temp_evolution_id,
					cp: p.cp,
					level: p.level,
					iv: p.iv !== undefined ? round(p.iv, 2) : undefined,
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
					display_pokemon_form: getNormalizedForm(p.display_pokemon_id, p.display_pokemon_form),
					seen_type: p.seen_type
				} as PokemonData;

				const littleRankings: PvpStats[] = [];
				const greatRankings: PvpStats[] = [];
				const ultraRankings: PvpStats[] = [];

				for (const rankings of p.pvp?.little ?? []) {
					if (showPvp(rankings.rank, "pvpRankLittle", false, filter ?? null))
						littleRankings.push(rankings);
				}
				for (const rankings of p.pvp?.great ?? []) {
					if (showPvp(rankings.rank, "pvpRankGreat", false, filter ?? null))
						greatRankings.push(rankings);
				}
				for (const rankings of p.pvp?.ultra ?? []) {
					if (showPvp(rankings.rank, "pvpRankUltra", false, filter ?? null))
						ultraRankings.push(rankings);
				}
				if (littleRankings.length || greatRankings.length || ultraRankings.length) {
					pokemon.pvp = {};
					if (littleRankings.length) pokemon.pvp.little = littleRankings;
					if (greatRankings.length) pokemon.pvp.great = greatRankings;
					if (ultraRankings.length) pokemon.pvp.ultra = ultraRankings;
				}

				data.push(pokemon);
			}

			return { data, examined };
		}
		error(500);
	}

	async querySingle(id: string, thisFetch?: typeof fetch): Promise<MinMapObject<PokemonData>[]> {
		const mon = await getSinglePokemon(id, thisFetch);
		return mon ? [mon] : [];
	}

	private buildGolbatQueries(filter: FilterPokemon | undefined): GolbatPokemonQuery[] {
		const enabledFilters = filter?.filters?.filter((f) => f.enabled) ?? [];
		if (enabledFilters.length === 0) {
			return [{ pokemon: [] }];
		}

		return enabledFilters.map((filter) => {
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
							if (form === 0 && masterPokemon.defaultFormId !== 0) {
								query.pokemon.push({
									id: filterPokemon.pokemon_id,
									form: masterPokemon.defaultFormId
								});
							} else if (form === masterPokemon.defaultFormId && form !== 0) {
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
	}
}
