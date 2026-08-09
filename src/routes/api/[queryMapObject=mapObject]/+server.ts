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

/**
 * Charged for a request that is answered without a query — a bad body, bounds
 * outside every permitted area, a hash the server doesn't hold. Small, since an
 * unresolved hash is a real part of the protocol, but never zero: each of these
 * still costs a body read, a decode and a permission check, and a free one can
 * be looped indefinitely.
 */
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
	// Filters are cached per browser, not per address: behind a reverse proxy every
	// logged-out visitor shares one address and would contend for one cache slot.
	const filterKey = getClientIdentity(event);
	const type = params.queryMapObject as MapObjectType;
	const family = featureFamily[type];

	const start = performance.now();
	if (!hasAnyFeatureAnywhereServer(locals.perms, family, locals.user)) error(401);
	const permCheckTime = performance.now();

	// Claimed before the body is even read, so that decoding — the most expensive
	// thing an unauthenticated caller can make this endpoint do — is behind the
	// limiter too. Every path below refunds what it did not use.
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
		// Malformed, oversized or over-nested body. A 500 with a stack is the wrong
		// shape for what is simply a bad request.
		await refund(DENIED_CHARGE);
		error(400);
	}
	// A valid msgpack body can still be a scalar, and reading a field off it
	// would throw out of the handler as a 500. The bounds get the same treatment:
	// they are the query, and an absent one reaches the driver as undefined.
	if (!data || typeof data !== "object" || Array.isArray(data) || !hasFiniteBounds(data)) {
		await refund(DENIED_CHARGE);
		error(400);
	}

	// Ahead of anything that writes to the cache: a request for somewhere this
	// client can't see must not be able to fill the cache, or evict from it.
	const permitted = checkFeaturesInBounds(locals.perms, family, data);

	if (!permitted) {
		await refund(DENIED_CHARGE);
		return respond(request, { data: [] }, { status: constants.HTTP_STATUS_UNAUTHORIZED });
	}

	// Clients poll with a filter hash instead of the whole filter. Ask for a
	// full resend whenever the cached copy is missing or stale.
	// typeof, not just the pattern: a msgpack body can carry a number here, which
	// would coerce for the test and then never match a stored string key.
	const filterHash =
		typeof data.filterHash === "string" && FILTER_HASH_PATTERN.test(data.filterHash)
			? data.filterHash
			: undefined;
	let filter: AnyFilter | undefined = data.filter;
	// Only ever set once a filter has been sent and the cache has refused it, so
	// it rides on the success below and nowhere else — the earlier returns either
	// precede the read or happen when no filter was sent at all.
	let extraHeaders: Record<string, string> | undefined;

	// A hash that was sent but is malformed must still be answered with a resend.
	// Falling through would run the query with no filter at all and return the
	// whole viewport, which is the opposite of what the client asked for.
	if (data.filterHash != null && !filterHash && !filter) {
		await refund(DENIED_CHARGE);
		return respond(request, { data: [] }, { status: constants.HTTP_STATUS_CONFLICT });
	}

	if (filterHash) {
		if (filter) {
			// The hash has to be the one this filter actually produces, or a client
			// could store an arbitrary filter under someone else's hash and change
			// what they see on their next hash-only poll.
			const cached =
				getFilterHash(filter) === filterHash && rememberFilter(filterKey, type, filterHash, filter);
			if (!cached) extraHeaders = { "X-Filter-Cached": "0" };
			// Query with the stored copy, so this request and every later hash-only
			// one run against the same object. Caching round-trips through JSON,
			// which does not survive values JSON cannot write.
			else filter = recallFilter(filterKey, type, filterHash) ?? filter;
		} else {
			filter = recallFilter(filterKey, type, filterHash);
			if (!filter) {
				// Charged, not free: a random hash would otherwise buy an unbounded
				// run of requests that each pay a body read and a compressed response.
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
