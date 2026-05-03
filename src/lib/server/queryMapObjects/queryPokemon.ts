import {
	MapObjectQuery,
	type MapObjectResponse
} from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { PokemonData, PvpStats } from "@/lib/types/mapObjectData/pokemon";
import type { FilterPokemon } from "@/lib/features/filters/filters";
import type { FiltersetPokemon, MinMax } from "@/lib/features/filters/filtersets";
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
	getBestRank,
	League,
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
				const pokemon = this.makePokemon(p, filter);
				// need to re-check pvp filters after removing mega evolutions 
				if (!this.matchesCleanedPvpRanks(pokemon, filter)) continue;

				data.push(pokemon);
			}

			return { data, examined };
		}
		error(500);
	}

	async querySingle(id: string, thisFetch?: typeof fetch): Promise<MinMapObject<PokemonData>[]> {
		const mon = await getSinglePokemon(id, thisFetch);
		return mon ? [this.makePokemon(mon, undefined)] : [];
	}

	private makePokemon(
		p: MinMapObject<PokemonData>,
		filter: FilterPokemon | undefined
	): PokemonData {
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
			iv: p.iv || p.iv === 0 ? round(p.iv, 2) : undefined,
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

		for (const rankings of p.pvp?.[League.LITTLE] ?? []) {
			if (showPvp(rankings.rank, "pvpRankLittle", false, filter ?? null))
				this.makePvpStats(littleRankings, rankings);
		}
		for (const rankings of p.pvp?.[League.GREAT] ?? []) {
			if (showPvp(rankings.rank, "pvpRankGreat", false, filter ?? null))
				this.makePvpStats(greatRankings, rankings);
		}
		for (const rankings of p.pvp?.[League.ULTRA] ?? []) {
			if (showPvp(rankings.rank, "pvpRankUltra", false, filter ?? null))
				this.makePvpStats(ultraRankings, rankings);
		}
		if (littleRankings.length || greatRankings.length || ultraRankings.length) {
			pokemon.pvp = {};
			if (littleRankings.length) pokemon.pvp[League.LITTLE] = littleRankings;
			if (greatRankings.length) pokemon.pvp[League.GREAT] = greatRankings;
			if (ultraRankings.length) pokemon.pvp[League.ULTRA] = ultraRankings;
		}
		return pokemon;
	}

	private makePvpStats(rankings: PvpStats[], stats: PvpStats) {
		if (stats.evolution) return;
		rankings.push({
			pokemon_id: stats.pokemon ?? 0,
			form: getNormalizedForm(stats.pokemon ?? 0, stats.form),
			cap: stats.cap,
			cp: stats.cp,
			level: stats.level,
			percentage: stats.percentage,
			rank: stats.rank,
			value: stats.value
		});
	}

	private matchesCleanedPvpRanks(pokemon: PokemonData, filter: FilterPokemon | undefined) {
		const enabledFilters = filter?.filters?.filter((f) => f.enabled) ?? [];
		if (enabledFilters.length === 0) return true;

		return enabledFilters.some((filterset) =>
			this.matchesCleanedPvpRankFilterset(pokemon, filterset)
		);
	}

	private matchesCleanedPvpRankFilterset(pokemon: PokemonData, filterset: FiltersetPokemon) {
		const hasPvpRankFilter =
			filterset.pvpRankLittle || filterset.pvpRankGreat || filterset.pvpRankUltra;
		if (!hasPvpRankFilter) return true;

		if (
			filterset.pvpRankLittle &&
			!this.matchesPvpRank(pokemon, League.LITTLE, filterset.pvpRankLittle)
		) {
			return false;
		}
		if (
			filterset.pvpRankGreat &&
			!this.matchesPvpRank(pokemon, League.GREAT, filterset.pvpRankGreat)
		) {
			return false;
		}
		if (
			filterset.pvpRankUltra &&
			!this.matchesPvpRank(pokemon, League.ULTRA, filterset.pvpRankUltra)
		) {
			return false;
		}

		return true;
	}

	private matchesPvpRank(pokemon: PokemonData, league: League, range: MinMax) {
		const rank = getBestRank(pokemon, league);
		if (!rank) return false;
		return rank >= range.min && rank <= range.max;

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
