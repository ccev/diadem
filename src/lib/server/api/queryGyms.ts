import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { FilterGym } from "@/lib/features/filters/filters";
import { LIMIT_GYM } from "@/lib/constants";
import { query } from "@/lib/server/db/external/internalQuery";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";

export async function queryGyms(bounds: Bounds, filter: FilterGym | undefined) {
	const boundsFilter = "WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND deleted = 0 ";
	const boundsValues = [bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon];

	let sqlQuery = "" + "SELECT * FROM gym " + boundsFilter;

	if (filter && !filter.gymPlain.enabled && filter.raid.enabled) {
		sqlQuery += "AND raid_end_timestamp > UNIX_TIMESTAMP() ";
	}

	sqlQuery += `LIMIT ${LIMIT_GYM}`;

	const { error, result } = await query<GymData[]>(sqlQuery, boundsValues);

	for (const gym of result) {
		gym.raid_pokemon_form = getNormalizedForm(gym.raid_pokemon_id, gym.raid_pokemon_form)
	}

	return [{ error, result }, undefined];
}
