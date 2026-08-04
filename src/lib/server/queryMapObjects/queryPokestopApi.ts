import type { FilterPokestop } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import {
	getGolbatPokestop,
	scanPokestops,
	type GolbatPokestopResult,
	type PokestopScanResponse
} from "@/lib/server/api/golbatApi";
import { buildPokestopDnfFilters } from "@/lib/server/queryMapObjects/fortDnf";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import { mapPokestop } from "@/lib/server/queryMapObjects/pokestopApiMapper";
import { PokestopQuery } from "@/lib/server/queryMapObjects/queryPokestop";
import type { FeaturePermissionContext, PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import { getLogger } from "@/lib/utils/logger";
import { booleanPointInPolygon, point } from "@turf/turf";

const log = getLogger("query:pokestop-api");

export class ApiPokestopQuery extends PokestopQuery {
	async query(
		bounds: Bounds,
		filter: FilterPokestop | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number,
		context?: FeaturePermissionContext
	): Promise<MapObjectResponse<MinMapObject<PokestopData>>> {
		const dnf = buildPokestopDnfFilters(filter);
		if (dnf === null) return { data: [], examined: 0 };

		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		let result: PokestopScanResponse | undefined;
		try {
			result = await scanPokestops({
				min: { latitude: bounds.minLat, longitude: bounds.minLon },
				max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
				limit: actualLimit + 1,
				filters: dnf.length ? dnf : undefined,
				with_incidents: true
			});
		} catch (err) {
			log.debug("Fort pokestop scan failed, falling back to SQL: %s", err);
		}
		if (!result) return super.query(bounds, filter, polygon, since, limit);

		if (result.limit_reached || result.pokestops.length > actualLimit) {
			return { data: [], examined: actualLimit, limitReached: true };
		}

		let examined = result.examined;
		const data: MinMapObject<PokestopData>[] = [];
		for (const p of result.pokestops) {
			if (p.deleted) continue;
			if (since !== undefined && (p.updated ?? 0) <= since) continue;
			if (polygon && !booleanPointInPolygon(point([p.lon, p.lat]), polygon)) {
				examined -= 1;
				continue;
			}
			data.push(mapPokestop(p));
		}
		return { data, examined };
	}

	async querySingle(id: string, thisFetch?: typeof fetch): Promise<MinMapObject<PokestopData>[]> {
		let stop: GolbatPokestopResult | undefined;
		try {
			stop = await getGolbatPokestop(id, thisFetch);
		} catch (err) {
			log.debug("Fort pokestop fetch failed, falling back to SQL: %s", err);
		}
		if (!stop) return super.querySingle(id);
		return stop.deleted ? [] : [mapPokestop(stop)];
	}
}
