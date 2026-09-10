import type {
	AnyFilter,
	FilterGym,
	FilterPokestop,
	FilterStation
} from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import {
	type MapObjectQuery,
	type MapObjectResponse
} from "@/lib/server/queryMapObjects/MapObjectQuery";
import { scanForts, type FortCombinedScanResponse } from "@/lib/server/api/golbatApi";
import { getFortApiScanLimit, isFortApiEnabled } from "@/lib/server/api/golbatFortApi";
import { grpcScanForts, scanViaGrpcOrHttp } from "@/lib/server/api/golbatGrpc";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { ApiGymQuery } from "@/lib/server/queryMapObjects/queryGymApi";
import { ApiPokestopQuery } from "@/lib/server/queryMapObjects/queryPokestopApi";
import { ApiStationQuery } from "@/lib/server/queryMapObjects/queryStationApi";
import {
	buildGymDnfFilters,
	buildPokestopDnfFilters,
	buildStationDnfFilters
} from "@/lib/server/queryMapObjects/fortDnf";
import { GymQuery } from "@/lib/server/queryMapObjects/queryGym";
import { NestQuery } from "@/lib/server/queryMapObjects/queryNest";
import { PokemonQuery } from "@/lib/server/queryMapObjects/queryPokemon";
import { PokestopQuery } from "@/lib/server/queryMapObjects/queryPokestop";
import type { FortCombinedScanBody, FortTypeScanGroup } from "@/lib/server/queryMapObjects/queries";
import { RouteQuery } from "@/lib/server/queryMapObjects/queryRoute";
import { SpawnpointQuery } from "@/lib/server/queryMapObjects/querySpawnpoint";
import { StationQuery } from "@/lib/server/queryMapObjects/queryStation";
import { TappableQuery } from "@/lib/server/queryMapObjects/queryTappable";
import type { FeaturePermissionContext, PermittedPolygon } from "@/lib/services/user/checkPerm";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";

const registry: Partial<Record<MapObjectType, MapObjectQuery<any, any>>> = {
	[MapObjectType.GYM]: new GymQuery(),
	[MapObjectType.POKESTOP]: new PokestopQuery(),
	[MapObjectType.POKEMON]: new PokemonQuery(),
	[MapObjectType.STATION]: new StationQuery(),
	[MapObjectType.NEST]: new NestQuery(),
	[MapObjectType.SPAWNPOINT]: new SpawnpointQuery(),
	[MapObjectType.ROUTE]: new RouteQuery(),
	[MapObjectType.TAPPABLE]: new TappableQuery()
};

const apiGymQuery = new ApiGymQuery();
const apiPokestopQuery = new ApiPokestopQuery();
const apiStationQuery = new ApiStationQuery();

const fortApiRegistry: Partial<Record<MapObjectType, MapObjectQuery<any, any>>> = {
	[MapObjectType.GYM]: apiGymQuery,
	[MapObjectType.POKESTOP]: apiPokestopQuery,
	[MapObjectType.STATION]: apiStationQuery
};

export function getQuery(type: MapObjectType): MapObjectQuery<any, any> {
	if (isFortApiEnabled()) {
		const apiQuery = fortApiRegistry[type];
		if (apiQuery) return apiQuery;
	}
	const query = registry[type];
	if (!query) error(404);
	return query;
}

export async function queryMapObjects<Data extends MapData>(
	type: MapObjectType,
	bounds: Bounds,
	filter: AnyFilter | undefined,
	polygon: PermittedPolygon = null,
	since?: number,
	limit?: number,
	context?: FeaturePermissionContext
): Promise<MapObjectResponse<Data>> {
	if (filter !== undefined && !filter.enabled) {
		return { examined: 0, data: [] };
	}

	return getQuery(type).getMultiple(bounds, filter, polygon, since, limit, context);
}

export async function querySingleMapObject(
	type: MapObjectType,
	id: string,
	thisFetch: typeof fetch = fetch,
	context?: FeaturePermissionContext
) {
	return getQuery(type).getSingle(id, thisFetch, context);
}

const log = getLogger("query:forts");

export type FortType = MapObjectType.GYM | MapObjectType.POKESTOP | MapObjectType.STATION;
export const fortTypes: FortType[] = [
	MapObjectType.GYM,
	MapObjectType.POKESTOP,
	MapObjectType.STATION
];

export type FortQueryEntry = {
	filter: AnyFilter | undefined;
	bounds: Bounds;
	polygon: PermittedPolygon;
	since?: number;
	limit: number;
	context?: FeaturePermissionContext;
};

export async function queryFortsCombined(
	entries: Partial<Record<FortType, FortQueryEntry>>
): Promise<Partial<Record<FortType, MapObjectResponse<MapData>>>> {
	const results: Partial<Record<FortType, MapObjectResponse<MapData>>> = {};
	const settle = async (type: FortType, run: () => Promise<MapObjectResponse<MapData>>) => {
		try {
			results[type] = await run();
		} catch (err) {
			log.error("Fort query for %s failed, serving no data for it: %s", type, err);
		}
	};
	const viaQuery = (type: FortType, query: MapObjectQuery<any, any>) => {
		const e = entries[type]!;
		return query.getMultiple(e.bounds, e.filter, e.polygon, e.since, e.limit, e.context);
	};

	const requested: FortType[] = [];
	for (const type of fortTypes) {
		const e = entries[type];
		if (!e) continue;
		if (e.filter !== undefined && !e.filter.enabled) {
			results[type] = { examined: 0, data: [] };
			continue;
		}
		requested.push(type);
	}

	if (!isFortApiEnabled()) {
		await Promise.all(requested.map((type) => settle(type, () => viaQuery(type, registry[type]!))));
		return results;
	}

	const groups: Partial<Record<FortType, FortTypeScanGroup>> = {};
	for (const type of requested) {
		const e = entries[type]!;
		const dnf =
			type === MapObjectType.GYM
				? buildGymDnfFilters(e.filter as FilterGym | undefined)
				: type === MapObjectType.POKESTOP
					? buildPokestopDnfFilters(e.filter as FilterPokestop | undefined)
					: buildStationDnfFilters(e.filter as FilterStation | undefined);
		if (dnf === null) {
			results[type] = { examined: 0, data: [] };
			continue;
		}
		groups[type] = {
			filters: dnf,
			limit: getFortApiScanLimit(Math.min(e.limit, requestLimits[type]) + 1)
		};
	}

	const scanTypes = requested.filter((type) => groups[type]);
	if (!scanTypes.length) return results;

	// Scan the union bounds; each API class applies its permission polygon afterwards.
	const union = scanTypes.reduce(
		(acc, type) => {
			const b = entries[type]!.bounds;
			return {
				minLat: Math.min(acc.minLat, b.minLat),
				minLon: Math.min(acc.minLon, b.minLon),
				maxLat: Math.max(acc.maxLat, b.maxLat),
				maxLon: Math.max(acc.maxLon, b.maxLon)
			};
		},
		{ ...entries[scanTypes[0]]!.bounds }
	);

	const body: FortCombinedScanBody = {
		min: { latitude: union.minLat, longitude: union.minLon },
		max: { latitude: union.maxLat, longitude: union.maxLon },
		limit: getFortApiScanLimit(scanTypes.reduce((sum, type) => sum + groups[type]!.limit, 0)),
		with_incidents: Boolean(groups[MapObjectType.POKESTOP]),
		gyms: groups[MapObjectType.GYM],
		pokestops: groups[MapObjectType.POKESTOP],
		stations: groups[MapObjectType.STATION]
	};

	let scan: FortCombinedScanResponse | undefined;
	try {
		scan = await scanViaGrpcOrHttp("forts", body, grpcScanForts, scanForts);
	} catch (err) {
		log.debug("Combined fort scan failed, falling back to the per-type fort API: %s", err);
	}
	if (!scan) {
		await Promise.all(scanTypes.map((type) => settle(type, () => viaQuery(type, getQuery(type)))));
		return results;
	}
	const done = scan;

	await Promise.all(
		scanTypes.map((type) => {
			const e = entries[type]!;
			const stats =
				type === MapObjectType.GYM
					? done.gyms_stats
					: type === MapObjectType.POKESTOP
						? done.pokestops_stats
						: done.stations_stats;
			// A per-type flag cannot rule out overall truncation; the top-level flag retries all types.
			if (done.limit_reached || stats.limit_reached)
				return settle(type, () => viaQuery(type, registry[type]!));
			return settle(type, async () => {
				const result =
					type === MapObjectType.GYM
						? apiGymQuery.processScan(done.gyms, stats.examined, e.polygon, e.since)
						: type === MapObjectType.POKESTOP
							? apiPokestopQuery.processScan(done.pokestops, stats.examined, e.polygon, e.since)
							: apiStationQuery.processScan(done.stations, stats.examined, e.polygon, e.since);
				return fortApiRegistry[type]!.finish(result, e.filter, e.polygon, e.context);
			});
		})
	);
	return results;
}
