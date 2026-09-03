import type { AnyFilter } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { MapObjectRequestData } from "@/lib/mapObjects/updateMapObject";
import { getClientIdentity } from "@/lib/server/api/clientIdentity";
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

/** Shape of getFilterHash's output; anything else never matches a cache entry. */
const FILTER_HASH_PATTERN = /^[0-9a-z]{1,16}$/;

/** Charge for a request answered without a query — bad body, denied bounds, unknown hash. */
const DENIED_CHARGE = 100;

function hasFiniteBounds(data: MapObjectRequestData): boolean {
	return (
		Number.isFinite(data.minLat) &&
		Number.isFinite(data.maxLat) &&
		Number.isFinite(data.minLon) &&
		Number.isFinite(data.maxLon)
	);
}

export const POST: RequestHandler = async (event) => {
	const { request, locals, params, getClientAddress } = event;
	const rateLimitKey = locals.user?.id ?? getClientAddress();
	// Keyed per browser: behind a proxy all logged-out visitors share one address.
	const filterKey = getClientIdentity(event);
	const type = params.queryMapObject as MapObjectType;
	const family = featureFamily[type];

	const start = performance.now();
	if (!hasAnyFeatureAnywhereServer(locals.perms, family, locals.user)) error(401);
	const permCheckTime = performance.now();

	// Claimed before the body is read, so decoding is behind the limiter too.
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

	/** Give back all but `charge` of what was claimed above. */
	const refund = async (charge: number) => {
		if (requestLimit > charge) await rateLimitReward(rateLimitKey, requestLimit - charge, type);
	};

	let data: MapObjectRequestData;
	try {
		data = await readRequestBody(request);
	} catch {
		// A malformed body is a 400, not a 500.
		await refund(DENIED_CHARGE);
		error(400);
	}
	if (!data || typeof data !== "object" || Array.isArray(data) || !hasFiniteBounds(data)) {
		await refund(DENIED_CHARGE);
		error(400);
	}

	// Checked before anything writes to the cache, so an unauthorized request
	// can't fill it or evict from it.
	const permitted = checkFeaturesInBounds(locals.perms, family, data);

	if (!permitted) {
		await refund(DENIED_CHARGE);
		return respond(request, { data: [] }, { status: constants.HTTP_STATUS_UNAUTHORIZED });
	}

	// typeof, not just the pattern: a msgpack body can carry a number here.
	const filterHash =
		typeof data.filterHash === "string" && FILTER_HASH_PATTERN.test(data.filterHash)
			? data.filterHash
			: undefined;
	let filter: AnyFilter | undefined = data.filter;
	// Set only when the cache refused a sent filter; rides on the success response.
	let extraHeaders: Record<string, string> | undefined;

	// A malformed hash still gets a resend, or the query would run filterless
	// and return the whole viewport.
	if (data.filterHash != null && !filterHash && !filter) {
		await refund(DENIED_CHARGE);
		return respond(request, { data: [] }, { status: constants.HTTP_STATUS_CONFLICT });
	}

	if (filterHash) {
		if (filter) {
			// The hash must match the sent filter, or a client could store an
			// arbitrary filter under someone else's hash.
			const cached =
				getFilterHash(filter) === filterHash && rememberFilter(filterKey, type, filterHash, filter);
			if (!cached) extraHeaders = { "X-Filter-Cached": "0" };
			// Query with the stored copy so every hash-only poll runs the same object.
			else filter = recallFilter(filterKey, type, filterHash) ?? filter;
		} else {
			filter = recallFilter(filterKey, type, filterHash);
			if (!filter) {
				// Charged, not free, so a random hash can't be looped cheaply.
				await refund(DENIED_CHARGE);
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
	const response = respond(request, result, extraHeaders ? { headers: extraHeaders } : undefined);
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
