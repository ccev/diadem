import type { FilterGym } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { getGolbatGym, scanGyms } from "@/lib/server/api/golbat/http";
import type { GolbatGymResult, GymScanResponse } from "@/lib/server/api/golbat/types";
import { grpcScanGyms, scanViaGrpcOrHttp } from "@/lib/server/api/golbat/grpc";
import { getFortApiScanLimit } from "@/lib/server/api/golbat/fortAvailability";
import { mapGym } from "@/lib/server/queryMapObjects/fortApiMapping";
import { buildGymDnfFilters } from "@/lib/server/queryMapObjects/fortDnf";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import { GymQuery } from "@/lib/server/queryMapObjects/queryGym";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import { getLogger } from "@/lib/utils/logger";
import { booleanPointInPolygon, point } from "@turf/turf";

const log = getLogger("query:gym-api");

export class ApiGymQuery extends GymQuery {
	async query(
		bounds: Bounds,
		filter: FilterGym | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number
	): Promise<MapObjectResponse<MinMapObject<GymData>>> {
		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		let result: GymScanResponse | undefined;
		try {
			result = await scanViaGrpcOrHttp(
				"gym",
				{
					min: { latitude: bounds.minLat, longitude: bounds.minLon },
					max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
					limit: getFortApiScanLimit(actualLimit + 1),
					filters: buildGymDnfFilters(filter)
				},
				grpcScanGyms,
				scanGyms
			);
		} catch (err) {
			log.debug("Fort gym scan failed, falling back to SQL: %s", err);
		}
		if (!result || result.limit_reached) return super.query(bounds, filter, polygon, since, limit);
		return this.processScan(result.gyms, result.examined, polygon, since);
	}

	processScan(
		gyms: GolbatGymResult[],
		examined: number,
		polygon: PermittedPolygon,
		since?: number
	): MapObjectResponse<MinMapObject<GymData>> {
		const data: MinMapObject<GymData>[] = [];
		for (const g of gyms) {
			if (g.deleted) continue;
			if (since !== undefined && (g.updated ?? 0) <= since) continue;
			if (polygon && !booleanPointInPolygon(point([g.lon, g.lat]), polygon)) {
				examined -= 1;
				continue;
			}
			data.push(mapGym(g));
		}
		return { data, examined };
	}

	async querySingle(id: string, thisFetch?: typeof fetch): Promise<MinMapObject<GymData>[]> {
		let gym: GolbatGymResult | undefined;
		try {
			gym = await getGolbatGym(id, thisFetch);
		} catch (err) {
			log.debug("Fort gym fetch failed, falling back to SQL: %s", err);
		}
		if (!gym) return super.querySingle(id);
		return gym.deleted ? [] : [mapGym(gym)];
	}
}
