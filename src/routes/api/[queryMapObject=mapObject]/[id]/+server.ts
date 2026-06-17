import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { rateLimitConsume } from "@/lib/server/api/rateLimit";
import { respond } from "@/lib/server/api/respond";
import { hasAnyFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { querySingleMapObject } from "@/lib/server/queryMapObjects/queryMapObjects";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { featureFamily } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";
import { error, json } from "@sveltejs/kit";
import { constants } from "http2";
import type { RequestHandler } from "./$types";

const log = getLogger("mapobject id");

export const GET: RequestHandler = async ({ params, locals, fetch, getClientAddress, request }) => {
	const rateLimitKey = locals.user?.id ?? getClientAddress();
	const type = params.queryMapObject as MapObjectType;
	const family = featureFamily[type];

	const start = performance.now();
	if (!hasAnyFeatureAnywhereServer(locals.perms, family, locals.user))
		error(constants.HTTP_STATUS_UNAUTHORIZED);

	const permissionContext = new FeaturePermissionContext(locals.perms, family);

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

	const data = await querySingleMapObject(
		params.queryMapObject,
		params.id,
		fetch,
		permissionContext
	);

	if (!data) error(constants.HTTP_STATUS_NOT_FOUND);

	if (!family.some((feature) => permissionContext.isAllowedAt(feature, data.lat, data.lon)))
		error(constants.HTTP_STATUS_UNAUTHORIZED);

	log.info(
		"[%s] Serving single map object / time: %dms",
		params.queryMapObject,
		(performance.now() - start).toFixed(1)
	);

	return json(data);
};
