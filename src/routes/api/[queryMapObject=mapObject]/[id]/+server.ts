import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getLogger } from "@/lib/utils/logger";
import { hasAnySubFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { makePointFeatureChecker } from "@/lib/services/user/checkPerm";
import { querySingleMapObject } from "@/lib/server/queryMapObjects/queryMapObjects";
import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { rateLimitConsume } from "@/lib/server/api/rateLimit";
import { respond } from "@/lib/server/api/respond";
import { MAP_OBJECT_SUB_FEATURES } from "@/lib/permissions/subFeatures";
import { constants } from "http2";

const log = getLogger("mapobject id");

export const GET: RequestHandler = async ({ params, locals, fetch, getClientAddress, request }) => {
	const rateLimitKey = locals.user?.id ?? getClientAddress();
	const type = params.queryMapObject as MapObjectType;

	const start = performance.now();
	if (!hasAnySubFeatureAnywhereServer(locals.perms, type, locals.user))
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

	// querySingleMapObject runs prepare() first, scrubbing fields the user
	// can't see. The 401 below short-circuits when no sub-feature applies at
	// the point, so a fully-scrubbed row is never returned.
	const data = await querySingleMapObject(params.queryMapObject, params.id, fetch, locals.perms);

	if (!data) error(constants.HTTP_STATUS_NOT_FOUND);

	const has = makePointFeatureChecker(locals.perms, data.lat, data.lon);
	const pointAllowed = MAP_OBJECT_SUB_FEATURES[type].some(has);
	if (!pointAllowed) error(constants.HTTP_STATUS_UNAUTHORIZED);

	log.info(
		"[%s] Serving single map object / time: %dms",
		params.queryMapObject,
		(performance.now() - start).toFixed(1)
	);

	return json(data);
};
