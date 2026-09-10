import type {
	AnyFilter,
	FilterGym,
	FilterPokestop,
	FilterStation
} from "@/lib/features/filters/filters";
import { combinedGolbatFortTypes, type FortType } from "@/lib/mapObjects/combinedForts";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import {
	type MapObjectQuery,
	type MapObjectResponse
} from "@/lib/server/queryMapObjects/MapObjectQuery";
import { scanForts } from "@/lib/server/api/golbat/http";
import { getFortApiScanLimit, isFortApiEnabled } from "@/lib/server/api/golbat/fortAvailability";
import { grpcScanForts, scanViaGrpcOrHttp } from "@/lib/server/api/golbat/grpc";
import { requestLimits } from "@/lib/server/api/rateLimit";
import {
	buildGymDnfFilters,
	buildPokestopDnfFilters,
	buildStationDnfFilters
} from "@/lib/server/queryMapObjects/fortDnf";
import type {
	FortCombinedScanBody,
	FortCombinedScanResponse,
	FortTypeScanGroup
} from "@/lib/server/api/golbat/types";
import { fortApiRegistry, getQuery } from "@/lib/server/queryMapObjects/queryMapObjects";
import type { FeaturePermissionContext, PermittedPolygon } from "@/lib/services/user/checkPerm";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("query:forts");

export type FortQueryEntry = {
	filter: AnyFilter | undefined;
	bounds: Bounds;
	polygon: PermittedPolygon;
	since?: number;
	limit: number;
	context?: FeaturePermissionContext;
};

export async function combinedForts(
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
	for (const type of combinedGolbatFortTypes) {
		const e = entries[type];
		if (!e) continue;
		if (e.filter !== undefined && !e.filter.enabled) {
			results[type] = { examined: 0, data: [] };
			continue;
		}
		requested.push(type);
	}

	if (!isFortApiEnabled()) {
		await Promise.all(
			requested.map((type) => settle(type, () => viaQuery(type, getQuery(type, false))))
		);
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
				return settle(type, () => viaQuery(type, getQuery(type, false)));
			return settle(type, async () => {
				if (type === MapObjectType.GYM) {
					const apiGymQuery = fortApiRegistry[type];
					return apiGymQuery.finish(
						apiGymQuery.processScan(done.gyms, stats.examined, e.polygon, e.since),
						e.filter as FilterGym | undefined,
						e.polygon,
						e.context
					);
				}
				if (type === MapObjectType.POKESTOP) {
					const apiPokestopQuery = fortApiRegistry[type];
					return apiPokestopQuery.finish(
						apiPokestopQuery.processScan(done.pokestops, stats.examined, e.polygon, e.since),
						e.filter as FilterPokestop | undefined,
						e.polygon,
						e.context
					);
				}
				const apiStationQuery = fortApiRegistry[type];
				return apiStationQuery.finish(
					apiStationQuery.processScan(done.stations, stats.examined, e.polygon, e.since),
					e.filter as FilterStation | undefined,
					e.polygon,
					e.context
				);
			});
		})
	);
	return results;
}
