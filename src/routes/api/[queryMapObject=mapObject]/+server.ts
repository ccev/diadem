import { error, json } from "@sveltejs/kit";
import { checkFeatureInBounds } from "@/lib/services/user/checkPerm";
import { queryMapObjects } from "@/lib/server/api/queryMapObjects";
import type { MapObjectRequestData } from "@/lib/mapObjects/updateMapObject";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("mapobjects");

export async function POST({ request, locals, params }) {
	const start = performance.now();
	if (!hasFeatureAnywhereServer(locals.perms, params.queryMapObject, locals.user)) error(401);
	const permCheckTime = performance.now();

	const data: MapObjectRequestData = await request.json();
	const type = params.queryMapObject as MapObjectType;
	const permitted = checkFeatureInBounds(locals.perms, params.queryMapObject, data);

	if (!permitted) {
		return json({ data: [] });
	}

	const result = await queryMapObjects(type, permitted.bounds, data.filter, permitted.polygon);

	log.info(
		"[%s] count: %d / permcheck: %fms + query: %fms",
		params.queryMapObject,
		result.data.length,
		(permCheckTime - start).toFixed(1),
		(performance.now() - permCheckTime).toFixed(1)
	);

	return json(result);
}
