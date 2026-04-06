import { error, json } from "@sveltejs/kit";
import { getLogger } from "@/lib/utils/logger";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { isPointInAllowedArea } from "@/lib/services/user/checkPerm";
import { querySingleMapObject } from "@/lib/server/queryMapObjects/queryMapObjects";

const log = getLogger("mapobject id");

export async function GET({ params, url, locals, fetch }) {
	const start = performance.now();
	if (!hasFeatureAnywhereServer(locals.perms, params.queryMapObject, locals.user)) error(401);

	const data = await querySingleMapObject(params.queryMapObject, params.id, fetch);

	if (!data) error(500);

	if (!isPointInAllowedArea(locals.perms, params.queryMapObject, data.lat, data.lon)) error(401);

	log.info(
		"[%s] Serving single map object / time: %dms",
		params.queryMapObject,
		(performance.now() - start).toFixed(1)
	);

	return json(data);
}
