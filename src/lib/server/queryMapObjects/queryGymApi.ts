import type { FilterGym } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { getGolbatGym, scanGyms, type GolbatGymResult } from "@/lib/server/api/golbatApi";
import { buildGymDnfFilters } from "@/lib/server/queryMapObjects/fortDnf";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import { GymQuery } from "@/lib/server/queryMapObjects/queryGym";
import type { FeaturePermissionContext, PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import { error } from "@sveltejs/kit";
import { booleanPointInPolygon, point } from "@turf/turf";

function mapGym(g: GolbatGymResult): MinMapObject<GymData> {
	const { available_slots, deleted, defenders, rsvps, ...rest } = g;
	const gym = {
		...rest,
		availble_slots: available_slots ?? undefined,
		deleted: deleted ? 1 : 0
	} as MinMapObject<GymData>;

	// Native JSON on the wire — inherited prepare() only parses the *_raw string
	// variants, so normalize forms here and assign directly.
	if (defenders) {
		gym.defenders = defenders;
		for (const defender of gym.defenders) {
			defender.form = getNormalizedForm(defender.pokemon_id, defender.form);
		}
	}
	if (rsvps) gym.rsvps = rsvps;

	return gym;
}

export class ApiGymQuery extends GymQuery {
	async query(
		bounds: Bounds,
		filter: FilterGym | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number,
		context?: FeaturePermissionContext
	): Promise<MapObjectResponse<MinMapObject<GymData>>> {
		const dnf = buildGymDnfFilters(filter);
		if (dnf === null) return { data: [], examined: 0 };

		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		const result = await scanGyms({
			min: { latitude: bounds.minLat, longitude: bounds.minLon },
			max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
			limit: actualLimit + 1,
			filters: dnf.length ? dnf : undefined
		});
		if (!result) error(500);

		if (result.limit_reached || result.gyms.length > actualLimit) {
			return { data: [], examined: actualLimit, limitReached: true };
		}

		let examined = result.examined;
		const data: MinMapObject<GymData>[] = [];
		for (const g of result.gyms) {
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
		const gym = await getGolbatGym(id, thisFetch);
		return gym && !gym.deleted ? [mapGym(gym)] : [];
	}
}
