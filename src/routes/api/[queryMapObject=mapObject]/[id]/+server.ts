import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getLogger } from "@/lib/utils/logger";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { isPointInAllowedArea } from "@/lib/services/user/checkPerm";
import { querySingleMapObject } from "@/lib/server/queryMapObjects/queryMapObjects";
import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { rateLimitConsume } from "@/lib/server/api/rateLimit";
import { respond } from "@/lib/server/api/respond";
import { constants } from "http2";

const log = getLogger("mapobject id");

export const GET: RequestHandler = async ({ params, locals, fetch, getClientAddress, request }) => {
	const rateLimitKey = locals.user?.id ?? getClientAddress();
	const type = params.queryMapObject as MapObjectType;

	const start = performance.now();
	if (!hasFeatureAnywhereServer(locals.perms, params.queryMapObject, locals.user))
		error(constants.HTTP_STATUS_UNAUTHORIZED);

	const [allowed, _remaining, totalLimit, headers] = await rateLimitConsume(rateLimitKey, 2, type);
	if (!allowed) {
		log.info(
			"[%s] User %s reached %d and was rate-limited",
			params.queryMapObject,
			locals.user?.id ?? "<ip>",
			totalLimit
		);
		return respond(
			request,
			{ data: [] },
			{ headers, status: constants.HTTP_STATUS_TOO_MANY_REQUESTS }
		);
	}

	const data = await querySingleMapObject(params.queryMapObject, params.id, fetch);

	if (!data) error(constants.HTTP_STATUS_NOT_FOUND);

	if (!isPointInAllowedArea(locals.perms, params.queryMapObject, data.lat, data.lon))
		error(constants.HTTP_STATUS_UNAUTHORIZED);

	log.info(
		"[%s] Serving single map object / time: %dms",
		params.queryMapObject,
		(performance.now() - start).toFixed(1)
	);

	return json(data);
};
