import type { FilterStation } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import {
	getGolbatStation,
	scanStations,
	type GolbatStationResult,
	type StationScanResponse
} from "@/lib/server/api/golbatApi";
import { buildStationDnfFilters } from "@/lib/server/queryMapObjects/fortDnf";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import { StationQuery } from "@/lib/server/queryMapObjects/queryStation";
import type { FeaturePermissionContext, PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { getLogger } from "@/lib/utils/logger";
import { booleanPointInPolygon, point } from "@turf/turf";

const log = getLogger("query:station-api");

function mapStation(s: GolbatStationResult): MinMapObject<StationData> {
	const { is_inactive, is_battle_available, stationed_pokemon, ...rest } = s;
	return {
		...rest,
		is_inactive: is_inactive ? 1 : 0,
		is_battle_available: is_battle_available ? 1 : 0,
		raw_stationed_pokemon: stationed_pokemon ?? undefined
	} as MinMapObject<StationData>;
}

export class ApiStationQuery extends StationQuery {
	async query(
		bounds: Bounds,
		filter: FilterStation | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number,
		context?: FeaturePermissionContext
	): Promise<MapObjectResponse<MinMapObject<StationData>>> {
		const dnf = buildStationDnfFilters(filter);
		if (dnf === null) return { data: [], examined: 0 };

		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		let result: StationScanResponse | undefined;
		try {
			result = await scanStations({
				min: { latitude: bounds.minLat, longitude: bounds.minLon },
				max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
				limit: actualLimit + 1,
				filters: dnf.length ? dnf : undefined
			});
		} catch (err) {
			log.debug("Fort station scan failed, falling back to SQL: %s", err);
		}
		if (!result) return super.query(bounds, filter, polygon, since, limit);

		if (result.limit_reached || result.stations.length > actualLimit) {
			return { data: [], examined: actualLimit, limitReached: true };
		}

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
		return station ? [mapStation(station)] : await super.querySingle(id);
	}
}
