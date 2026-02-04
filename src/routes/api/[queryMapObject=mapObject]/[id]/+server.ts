import { error, json } from "@sveltejs/kit";
import { getLogger } from "@/lib/utils/logger";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { type MapData } from "@/lib/mapObjects/mapObjectTypes";
import { isPointInAllowedArea } from "@/lib/services/user/checkPerm";
import { querySingleMapObject } from "@/lib/server/api/querySingleMapObject";
import { makeMapObject } from "@/lib/mapObjects/makeMapObject";

const log = getLogger("mapobject id");

export async function GET({ params, url, locals, fetch }) {
	const start = performance.now();
	if (!hasFeatureAnywhereServer(locals.perms, params.queryMapObject, locals.user)) error(401);

	const result = await querySingleMapObject(params.queryMapObject, params.id, fetch);

	let data: MapData = result.result[0];

	if (!data) error(500);

	data = makeMapObject(data, params.queryMapObject);

	if (!isPointInAllowedArea(locals.perms, params.queryMapObject, data.lat, data.lon)) error(401);

	log.info(
		"[%s] Serving single map object / time: %dms",
		params.queryMapObject,
		(performance.now() - start).toFixed(1)
	);

	return json(data);
}
