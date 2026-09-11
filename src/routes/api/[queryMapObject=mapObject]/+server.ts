import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { MapObjectRequestData } from "@/lib/mapObjects/updateMapObject";
import { readRequestBody } from "@/lib/server/api/requestBody";
import { rateLimitReward } from "@/lib/server/api/rateLimit";
import {
	admitType,
	isValidBounds,
	refundDenied,
	requestSince,
	resolveTypeRequest,
	settleTypeRequest
} from "@/lib/server/api/mapObjectRequest";
import { respond } from "@/lib/server/api/respond";
import { queryMapObjects } from "@/lib/server/queryMapObjects/queryMapObjects";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";
import { constants } from "http2";
import type { RequestHandler } from "./$types";

const log = getLogger("mapobjects");

export const POST: RequestHandler = async ({ request, locals, params, getClientAddress }) => {
	const rateLimitKey = locals.user?.id ?? getClientAddress();
	const type = params.queryMapObject as MapObjectType;

	const start = performance.now();
	const admitted = await admitType(type, locals, rateLimitKey);
	if (admitted.status === 401) error(401);
	const permCheckTime = performance.now();
	if (admitted.status === 429) {
		log.info(
			"[%s] User %s reached %d and was rate-limited",
			params.queryMapObject,
			locals.user?.id ?? "<ip>",
			admitted.totalLimit
		);
		return respond(
			request,
			{ data: [] },
			{ headers: admitted.headers, status: constants.HTTP_STATUS_TOO_MANY_REQUESTS }
		);
	}
	const { requestLimit, totalLimit } = admitted;

	let data: MapObjectRequestData;
	try {
		data = await readRequestBody(request);
	} catch {
		await refundDenied(type, rateLimitKey, requestLimit);
		error(400);
	}
	if (!isValidBounds(data)) {
		await refundDenied(type, rateLimitKey, requestLimit);
		error(400);
	}

	const resolved = await resolveTypeRequest(type, locals, rateLimitKey, requestLimit, data, data);
	if (resolved.status !== 200) {
		if (resolved.status === 400) error(400);
		if (resolved.status === 401) {
			return respond(request, { data: [] }, { status: constants.HTTP_STATUS_UNAUTHORIZED });
		}
		return respond(request, { data: [] }, { status: constants.HTTP_STATUS_CONFLICT });
	}
	const extraHeaders = resolved.filterCached
		? { "X-Filter-Cached": resolved.filterCached }
		: undefined;
	const since = requestSince(data);

	const result = await queryMapObjects(
		type,
		resolved.permitted.bounds,
		resolved.filter,
		resolved.permitted.polygon,
		since,
		requestLimit,
		resolved.context
	).catch(async (e) => {
		await rateLimitReward(rateLimitKey, requestLimit, type);
		throw e;
	});

	const { charge, remainingPoints } = await settleTypeRequest(
		type,
		rateLimitKey,
		requestLimit,
		since,
		result
	);

	const queryTime = performance.now();
	const response = respond(request, result, { headers: extraHeaders });
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
