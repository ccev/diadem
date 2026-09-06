import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { MapObjectRequestData } from "@/lib/mapObjects/updateMapObject";
import { getFilterHash } from "@/lib/utils/filterHash";
import { recallFilter, rememberFilter } from "@/lib/server/api/filterCache";
import { readRequestBody } from "@/lib/server/api/requestBody";
import {
	calculateRequestCharge,
	rateLimit,
	rateLimitConsume,
	rateLimitReward,
	requestLimits
} from "@/lib/server/api/rateLimit";
import { respond } from "@/lib/server/api/respond";
import { hasAnyFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { queryMapObjects } from "@/lib/server/queryMapObjects/queryMapObjects";
import { checkFeaturesInBounds, FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { featureFamily } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";
import { constants } from "http2";
import type { RequestHandler } from "./$types";

const log = getLogger("mapobjects");

const FILTER_HASH_PATTERN = /^[0-9a-f]{64}$/;
const DENIED_CHARGE = 100;

export const POST: RequestHandler = async ({ request, locals, params, getClientAddress }) => {
	const rateLimitKey = locals.user?.id ?? getClientAddress();
	const type = params.queryMapObject as MapObjectType;
	const family = featureFamily[type];

	const start = performance.now();
	if (!hasAnyFeatureAnywhereServer(locals.perms, family, locals.user)) error(401);
	const permCheckTime = performance.now();

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

	const refundDeniedRequest = async () => {
		if (requestLimit > DENIED_CHARGE) {
			await rateLimitReward(rateLimitKey, requestLimit - DENIED_CHARGE, type);
		}
	};

	let data: MapObjectRequestData;
	try {
		data = await readRequestBody(request);
	} catch {
		await refundDeniedRequest();
		error(400);
	}
	if (
		!data ||
		typeof data !== "object" ||
		Array.isArray(data) ||
		!Number.isFinite(data.minLat) ||
		!Number.isFinite(data.maxLat) ||
		!Number.isFinite(data.minLon) ||
		!Number.isFinite(data.maxLon)
	) {
		await refundDeniedRequest();
		error(400);
	}

	const permitted = checkFeaturesInBounds(locals.perms, family, data);

	if (!permitted) {
		await refundDeniedRequest();
		return respond(request, { data: [] }, { status: constants.HTTP_STATUS_UNAUTHORIZED });
	}

	const filterHash =
		typeof data.filterHash === "string" && FILTER_HASH_PATTERN.test(data.filterHash)
			? data.filterHash
			: undefined;
	let filter = data.filter;
	let extraHeaders: Record<string, string> | undefined;

	if (data.filterHash !== undefined && !filterHash) {
		await refundDeniedRequest();
		error(400);
	}

	if (filterHash) {
		if (filter) {
			const cached = getFilterHash(filter) === filterHash && rememberFilter(filterHash, filter);
			extraHeaders = { "X-Filter-Cached": cached ? "1" : "0" };
		} else {
			filter = recallFilter(filterHash);
			if (!filter) {
				await refundDeniedRequest();
				return respond(request, { data: [] }, { status: constants.HTTP_STATUS_CONFLICT });
			}
		}
	}

	const permissionContext = new FeaturePermissionContext(locals.perms, family);

	const result = await queryMapObjects(
		type,
		permitted.bounds,
		filter,
		permitted.polygon,
		data.since,
		requestLimit,
		permissionContext
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
