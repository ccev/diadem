import type { FilterStation } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { getGolbatStation, scanStations } from "@/lib/server/api/golbat/http";
import type { GolbatStationResult, StationScanResponse } from "@/lib/server/api/golbat/types";
import { grpcScanStations, scanViaGrpcOrHttp } from "@/lib/server/api/golbat/grpc";
import { getFortApiScanLimit } from "@/lib/server/api/golbat/fortAvailability";
import { buildStationDnfFilters } from "@/lib/server/queryMapObjects/fortDnf";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import { mapStation } from "@/lib/server/queryMapObjects/fortApiMapping";
import { StationQuery } from "@/lib/server/queryMapObjects/queryStation";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { getLogger } from "@/lib/utils/logger";
import { booleanPointInPolygon, point } from "@turf/turf";

const log = getLogger("query:station-api");

export class ApiStationQuery extends StationQuery {
	async query(
		bounds: Bounds,
		filter: FilterStation | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number
	): Promise<MapObjectResponse<MinMapObject<StationData>>> {
		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		let result: StationScanResponse | undefined;
		try {
			result = await scanViaGrpcOrHttp(
				"station",
				{
					min: { latitude: bounds.minLat, longitude: bounds.minLon },
					max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
					limit: getFortApiScanLimit(actualLimit + 1),
					filters: buildStationDnfFilters(filter)
				},
				grpcScanStations,
				scanStations
			);
		} catch (err) {
			log.debug("Fort station scan failed, falling back to SQL: %s", err);
		}
		if (!result || result.limit_reached) return super.query(bounds, filter, polygon, since, limit);
		return this.processScan(result.stations, result.examined, polygon, since);
	}

	processScan(
		stations: GolbatStationResult[],
		examined: number,
		polygon: PermittedPolygon,
		since?: number
	): MapObjectResponse<MinMapObject<StationData>> {
		const data: MinMapObject<StationData>[] = [];
		for (const s of stations) {
			if (since !== undefined && (s.updated ?? 0) <= since) continue;
			if (polygon && !booleanPointInPolygon(point([s.lon, s.lat]), polygon)) {
				examined -= 1;
				continue;
			}
			data.push(mapStation(s));
		}
		return { data, examined };
	}

	async querySingle(id: string, thisFetch?: typeof fetch): Promise<MinMapObject<StationData>[]> {
		let station: GolbatStationResult | undefined;
		try {
			station = await getGolbatStation(id, thisFetch);
		} catch (err) {
			log.debug("Fort station fetch failed, falling back to SQL: %s", err);
		}
		return station ? [mapStation(station)] : super.querySingle(id);
	}
}
