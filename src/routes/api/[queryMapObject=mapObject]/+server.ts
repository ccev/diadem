import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { checkFeatureInBounds } from "@/lib/services/user/checkPerm";
import { queryMapObjects } from "@/lib/server/queryMapObjects/queryMapObjects";
import type { MapObjectRequestData } from "@/lib/mapObjects/updateMapObject";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getLogger } from "@/lib/utils/logger";
import { respond } from "@/lib/server/api/respond";
import { consumeRateLimit, requestLimits, rewardRateLimit } from "@/lib/server/api/rateLimit";
import { constants } from "http2";

const log = getLogger("mapobjects");

export const POST: RequestHandler = async ({ request, locals, params, getClientAddress }) => {
	const rateLimitKey = locals.user?.id ?? getClientAddress();
	const type = params.queryMapObject as MapObjectType;

	const start = performance.now();
	if (!hasFeatureAnywhereServer(locals.perms, params.queryMapObject, locals.user)) error(401);
	const permCheckTime = performance.now();

	const data: MapObjectRequestData = await request.json();
	const permitted = checkFeatureInBounds(locals.perms, params.queryMapObject, data);

	if (!permitted) {
		return respond(request, { data: [] }, { status: constants.HTTP_STATUS_UNAUTHORIZED });
	}

	const reservePoints = requestLimits[type];
	const [allowed, remainingPoints, totalLimit, headers] = await consumeRateLimit(
		rateLimitKey,
		reservePoints,
		type
	);

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

	const result = await queryMapObjects(
		type,
		permitted.bounds,
		data.filter,
		permitted.polygon,
		data.since,
		reservePoints
	).catch(async (e) => {
		await rewardRateLimit(rateLimitKey, reservePoints, type);
		throw e;
	});

	const refundPoints = Math.max(0, reservePoints - result.data.length);
	await rewardRateLimit(rateLimitKey, refundPoints, type);

	const queryTime = performance.now();
	const response = respond(request, result);
	const serializeTime = performance.now();
	const finalRemainingPoints = Math.min(totalLimit, remainingPoints + refundPoints);

	log.info(
		"[%s] count: %d / rate limit: %d/%d / permcheck: %fms + query: %fms + serialize: %fms",
		params.queryMapObject,
		result.data.length,
		finalRemainingPoints,
		totalLimit,
		(permCheckTime - start).toFixed(1),
		(queryTime - permCheckTime).toFixed(1),
		(serializeTime - queryTime).toFixed(1)
	);

	return response;
};
