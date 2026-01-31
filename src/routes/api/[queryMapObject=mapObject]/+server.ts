import { error, json } from "@sveltejs/kit";
import { checkFeatureInBounds } from "@/lib/services/user/checkPerm";
import { queryMapObjects } from "@/lib/server/api/queryMapObjects";
import type { MapObjectRequestData } from "@/lib/mapObjects/updateMapObject";
import { getServerLogger } from "@/lib/server/logging";
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
	const bounds = checkFeatureInBounds(locals.perms, params.queryMapObject, data);

	if (!bounds) {
		log.warning("[%s] access denied - viewport outside permitted areas", params.queryMapObject);
		return json({ data: [] });
	}

	const queried = await queryMapObjects(type, bounds, data.filter);

	log.info(
		"[%s] count: %d / permcheck: %fms + query: %fms / error: %s",
		params.queryMapObject,
		queried.result.data.length,
		(permCheckTime - start).toFixed(1),
		(performance.now() - permCheckTime).toFixed(1),
		queried.error ?? "no"
	);

	if (queried.error) {
		error(queried.error);
	}

	return json(queried.result);
}
