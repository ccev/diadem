import type { FilterPokestop } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import {
	getGolbatPokestop,
	scanPokestops,
	type GolbatPokestopResult
} from "@/lib/server/api/golbatApi";
import { buildPokestopDnfFilters } from "@/lib/server/queryMapObjects/fortDnf";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import { PokestopQuery } from "@/lib/server/queryMapObjects/queryPokestop";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { Incident, PokestopData } from "@/lib/types/mapObjectData/pokestop";
import { error } from "@sveltejs/kit";
import { booleanPointInPolygon, point } from "@turf/turf";

function mapPokestop(p: GolbatPokestopResult): MinMapObject<PokestopData> {
	const { deleted, invasions, ...rest } = p;
	const pokestop = {
		...rest,
		deleted: deleted ? 1 : 0,
		incident: (invasions ?? []).map(
			(i) => ({ ...i, confirmed: i.confirmed }) as unknown as Incident
		)
	} as MinMapObject<PokestopData>;
	return pokestop;
}

export class ApiPokestopQuery extends PokestopQuery {
	async query(
		bounds: Bounds,
		filter: FilterPokestop | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number
	): Promise<MapObjectResponse<MinMapObject<PokestopData>>> {
		const dnf = buildPokestopDnfFilters(filter);
		if (dnf === null) return { data: [], examined: 0 };

		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		const result = await scanPokestops({
			min: { latitude: bounds.minLat, longitude: bounds.minLon },
			max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
			limit: actualLimit + 1,
			filters: dnf.length ? dnf : undefined,
			with_incidents: true
		});
		if (!result) error(500);

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
		const stop = await getGolbatPokestop(id, thisFetch);
		return stop && !stop.deleted ? [mapPokestop(stop)] : [];
	}
}
