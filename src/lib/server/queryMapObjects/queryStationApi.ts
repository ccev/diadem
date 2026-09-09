import type { FilterStation } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import {
	getGolbatStation,
	scanStations,
	type GolbatStationResult,
	type StationScanResponse
} from "@/lib/server/api/golbatApi";
import { grpcScanStations, scanViaGrpcOrHttp } from "@/lib/server/api/golbatGrpc";
import { getFortApiScanLimit } from "@/lib/server/api/golbatFortApi";
import { buildStationDnfFilters } from "@/lib/server/queryMapObjects/fortDnf";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import { blobToString } from "@/lib/server/queryMapObjects/pokestopApiMapper";
import { StationQuery } from "@/lib/server/queryMapObjects/queryStation";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { getLogger } from "@/lib/utils/logger";
import { booleanPointInPolygon, point } from "@turf/turf";

const log = getLogger("query:station-api");

function mapStation(s: GolbatStationResult): MinMapObject<StationData> {
	const {
		is_inactive,
		is_battle_available,
		stationed_pokemon,
		// API-only fields are not covered by inherited permission stripping.
		battles,
		battle_start,
		battle_end,
		...rest
	} = s;
	return {
		...rest,
		is_inactive: is_inactive ? 1 : 0,
		is_battle_available: is_battle_available ? 1 : 0,
		raw_stationed_pokemon: blobToString(stationed_pokemon)
	};
}

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

		let examined = result.examined;
		const data: MinMapObject<StationData>[] = [];
		for (const s of result.stations) {
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
