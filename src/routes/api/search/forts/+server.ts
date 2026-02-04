import { error, json } from "@sveltejs/kit";
import { getLogger } from "@/lib/utils/logger";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { query } from "@/lib/server/db/external/internalQuery";
import type { RawFortSearchEntry } from "@/lib/services/search.svelte";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { checkFeatureInBounds } from "@/lib/services/user/checkPerm";

const log = getLogger("fortsearch");

export async function POST({ request, locals }) {
	let hasPokestops = hasFeatureAnywhereServer(locals.perms, MapObjectType.POKESTOP, locals.user);
	let hasGyms = hasFeatureAnywhereServer(locals.perms, MapObjectType.GYM, locals.user);
	if (!hasPokestops && !hasGyms) error(401);

	const bounds = (await request.json()) as Bounds;

	const whereBounds = "WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?";

	const pokestopBounds = checkFeatureInBounds(locals.perms, MapObjectType.POKESTOP, bounds);

	const gymBounds = checkFeatureInBounds(locals.perms, MapObjectType.GYM, bounds);

	const queries = []
	let values: number[] = []

	if (hasPokestops && pokestopBounds) {
		queries.push("(SELECT 'p' AS type, name, id, url FROM pokestop " + whereBounds + " AND deleted = 0)")
		values = values.concat([pokestopBounds.minLat, pokestopBounds.maxLat, pokestopBounds.minLon, pokestopBounds.maxLon])
	}

	if (hasGyms && gymBounds) {
		queries.push("(SELECT 'g' AS type, name, id, url FROM gym " + whereBounds + " AND deleted = 0)")
		values = values.concat([gymBounds.minLat, gymBounds.maxLat, gymBounds.minLon, gymBounds.maxLon])
	}

	if (queries.length === 0) error(401)

	const result = await query<RawFortSearchEntry[]>(
		queries.join(" UNION ALL ") + " ORDER BY name ASC",
		values
	);

	if (result.error) {
		log.error("Error while querying fort search: " + result.error);
		error(500);
	}

	log.info("Succcessfully serving %d fort results", result.result.length);

	return json(result.result);
}
