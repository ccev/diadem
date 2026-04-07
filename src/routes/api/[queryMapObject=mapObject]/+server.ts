import { error } from "@sveltejs/kit";
import { checkFeatureInBounds } from "@/lib/services/user/checkPerm";
import { queryMapObjects } from "@/lib/server/queryMapObjects/queryMapObjects";
import type { MapObjectRequestData } from "@/lib/mapObjects/updateMapObject";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getLogger } from "@/lib/utils/logger";
import { respond } from "@/lib/server/api/respond";
import { isRateLimited, rateLimit } from "@/lib/server/api/rateLimit";
import { constants } from "http2";

const log = getLogger("mapobjects");

export async function POST({ request, locals, params, getClientAddress }) {
	const rateLimitKey = locals.user?.id ?? getClientAddress();
	const type = params.queryMapObject as MapObjectType;

	let [limit, totalLimit, headers] = await isRateLimited(rateLimitKey, type);
	if (limit <= 0) {
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

	const start = performance.now();
	if (!hasFeatureAnywhereServer(locals.perms, params.queryMapObject, locals.user)) error(401);
	const permCheckTime = performance.now();

	const data: MapObjectRequestData = await request.json();
	const permitted = checkFeatureInBounds(locals.perms, params.queryMapObject, data);

	if (!permitted) {
		return respond(request, { data: [] }, { status: constants.HTTP_STATUS_UNAUTHORIZED });
	}

	const result = await queryMapObjects(
		type,
		permitted.bounds,
		data.filter,
		permitted.polygon,
		data.since,
		limit
	);

	const queryTime = performance.now();
	const response = respond(request, result);
	const serializeTime = performance.now();

	await rateLimit(rateLimitKey, result.data.length, type);

	log.info(
		"[%s] count: %d / rate limit: %d/%d / permcheck: %fms + query: %fms + serialize: %fms",
		params.queryMapObject,
		result.data.length,
		limit,
		totalLimit,
		(permCheckTime - start).toFixed(1),
		(queryTime - permCheckTime).toFixed(1),
		(serializeTime - queryTime).toFixed(1)
	);

	return response;
}
