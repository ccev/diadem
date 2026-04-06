import { error, json } from "@sveltejs/kit";
import { getLogger } from "@/lib/utils/logger";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { query } from "@/lib/server/db/external/internalQuery";
import type { RawFortSearchEntry } from "@/lib/services/search.svelte";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { checkFeatureInBounds, type PermittedBounds } from "@/lib/services/user/checkPerm";
import { buildSpatialFilter } from "@/lib/server/api/spatialFilter";

const log = getLogger("fortsearch");

export async function POST({ request, locals }) {
	let hasPokestops = hasFeatureAnywhereServer(locals.perms, MapObjectType.POKESTOP, locals.user);
	let hasGyms = hasFeatureAnywhereServer(locals.perms, MapObjectType.GYM, locals.user);
	if (!hasPokestops && !hasGyms) error(401);

	const bounds = (await request.json()) as Bounds;

	const pokestopPermitted = checkFeatureInBounds(locals.perms, MapObjectType.POKESTOP, bounds);
	const gymPermitted = checkFeatureInBounds(locals.perms, MapObjectType.GYM, bounds);

	const queries = [];
	let values: any[] = [];

	if (hasPokestops && pokestopPermitted) {
		const spatial = buildSpatialFilter(pokestopPermitted.polygon ?? null, pokestopPermitted.bounds);
		queries.push(
			"(SELECT 'p' AS type, name, id, url FROM pokestop WHERE " +
				spatial.sql +
				" AND name IS NOT NULL AND deleted = 0)"
		);
		values = values.concat(spatial.values);
	}

	if (hasGyms && gymPermitted) {
		const spatial = buildSpatialFilter(gymPermitted.polygon ?? null, gymPermitted.bounds);
		queries.push(
			"(SELECT 'g' AS type, name, id, url FROM gym WHERE " +
				spatial.sql +
				" AND name IS NOT NULL AND deleted = 0)"
		);
		values = values.concat(spatial.values);
	}

	if (queries.length === 0) error(401);

	try {
		const result = await query<RawFortSearchEntry[]>(
			queries.join(" UNION ALL ") + " ORDER BY name ASC",
			values
		);

		log.info("Succcessfully serving %d fort results", result.length);

		return json(result);
	} catch (e) {
		log.error("Error while querying fort search", e);
		error(500);
	}
}
