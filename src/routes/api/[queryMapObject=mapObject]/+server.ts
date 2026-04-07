import { error } from "@sveltejs/kit";
import { checkFeatureInBounds } from "@/lib/services/user/checkPerm";
import { queryMapObjects } from "@/lib/server/queryMapObjects/queryMapObjects";
import type { MapObjectRequestData } from "@/lib/mapObjects/updateMapObject";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getLogger } from "@/lib/utils/logger";
import { respond } from "@/lib/server/api/respond";

const log = getLogger("mapobjects");

export async function POST({ request, locals, params }) {
	const start = performance.now();
	if (!hasFeatureAnywhereServer(locals.perms, params.queryMapObject, locals.user)) error(401);
	const permCheckTime = performance.now();

	const data: MapObjectRequestData = await request.json();
	const type = params.queryMapObject as MapObjectType;
	const permitted = checkFeatureInBounds(locals.perms, params.queryMapObject, data);

	if (!permitted) {
		return respond(request, { data: [] });
	}

	const result = await queryMapObjects(type, permitted.bounds, data.filter, permitted.polygon, data.since);

	const queryTime = performance.now();
	const response = respond(request, result);
	const serializeTime = performance.now();

	log.info(
		"[%s] count: %d / permcheck: %fms + query: %fms + serialize: %fms",
		params.queryMapObject,
		result.data.length,
		(permCheckTime - start).toFixed(1),
		(queryTime - permCheckTime).toFixed(1),
		(serializeTime - queryTime).toFixed(1)
	);

	return response;
}
