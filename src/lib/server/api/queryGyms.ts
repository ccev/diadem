import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { FilterGym } from "@/lib/features/filters/filters";
import { LIMIT_GYM } from "@/lib/constants";
import { query } from "@/lib/server/db/external/internalQuery";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { buildSpatialFilter } from "@/lib/server/api/spatialFilter";

import { FIELDS_GYM } from "@/lib/mapObjects/queryFields";
import { error } from "@sveltejs/kit";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { MapObjectResponse } from "@/lib/server/api/queryMapObjects";

export async function queryGyms(
	bounds: Bounds,
	filter: FilterGym | undefined,
	polygon: Feature<Polygon | MultiPolygon> | null = null
): Promise<MapObjectResponse<GymData>> {
	const spatial = buildSpatialFilter(polygon, bounds);

	let sqlQuery = "SELECT " + FIELDS_GYM + " FROM gym WHERE " + spatial.sql + " AND deleted = 0 ";

	if (filter && !filter.gymPlain.enabled && filter.raid.enabled) {
		sqlQuery += "AND raid_end_timestamp > UNIX_TIMESTAMP() ";
	}

	sqlQuery += `LIMIT ${LIMIT_GYM}`;

	const result = await query<MinMapObject<GymData>[]>(sqlQuery, spatial.values);

	for (const gym of result) {
		gym.raid_pokemon_form = getNormalizedForm(gym.raid_pokemon_id, gym.raid_pokemon_form);
	}

	return { data: result, examined: result.length };
}
