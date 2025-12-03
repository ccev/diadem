import { error, json } from "@sveltejs/kit";
import { checkFeatureInBounds, hasFeatureAnywhere } from "@/lib/services/user/checkPerm";

import { noPermResult } from "@/lib/server/api/results";
import type { MapObjectType } from "@/lib/types/mapObjectData/mapObjects";
import { queryMapObjects } from "@/lib/server/api/queryMapObjects";
import type { MapObjectRequestData } from "@/lib/mapObjects/updateMapObject";
import { getLogger } from "@/lib/server/logging";

const log = getLogger("mapobjects");

export async function POST({ request, locals, params }) {
	const start = performance.now();
	if (!hasFeatureAnywhere(locals.perms, params.queryMapObject)) return json(noPermResult());
	const permCheckTime = performance.now()

	const data: MapObjectRequestData = await request.json();
	const type = params.queryMapObject as MapObjectType;
	const bounds = checkFeatureInBounds(locals.perms, params.queryMapObject, data);

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
