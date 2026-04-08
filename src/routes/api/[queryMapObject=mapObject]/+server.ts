import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { checkFeatureInBounds } from "@/lib/services/user/checkPerm";
import { queryMapObjects } from "@/lib/server/queryMapObjects/queryMapObjects";
import type { MapObjectRequestData } from "@/lib/mapObjects/updateMapObject";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getLogger } from "@/lib/utils/logger";
import { respond } from "@/lib/server/api/respond";
import {
	calculateRequestCharge,
	rateLimitConsume,
	requestLimits,
	rateLimitReward,
	rateLimit
} from "@/lib/server/api/rateLimit";
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

	const requestLimit = requestLimits[type];
	const [allowed, _, totalLimit, headers] = await rateLimitConsume(
		rateLimitKey,
		requestLimit,
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
		requestLimit
	).catch(async (e) => {
		await rateLimitReward(rateLimitKey, requestLimit, type);
		throw e;
	});

	let chargeForAmount = result.examined;
	const hardLimit = requestLimits[type];
	if (chargeForAmount > hardLimit) chargeForAmount = hardLimit;

	const charge = calculateRequestCharge(data.since, result.data.length, chargeForAmount);

	const refundPoints = requestLimit - charge;
	let remainingPoints = 1;
	if (refundPoints > 0) {
		remainingPoints = await rateLimitReward(rateLimitKey, refundPoints, type);
	} else if (refundPoints < 0) {
		remainingPoints = await rateLimit(rateLimitKey, -1 * refundPoints, type);
	}

	const queryTime = performance.now();
	const response = respond(request, result);
	const serializeTime = performance.now();

	log.info(
		"[%s] count: %d | rate limit: %d/%d (charged %d) | permcheck: %fms + query: %fms + serialize: %fms",
		params.queryMapObject,
		result.data.length,
		remainingPoints,
		totalLimit,
		charge,
		(permCheckTime - start).toFixed(1),
		(queryTime - permCheckTime).toFixed(1),
		(serializeTime - queryTime).toFixed(1)
	);

	return response;
};
