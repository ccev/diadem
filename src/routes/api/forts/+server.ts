import type { FortsRequestData, FortsResponse } from "@/lib/mapObjects/updateMapObject";
import {
	admitType,
	isValidBounds,
	requestSince,
	resolveTypeRequest,
	settleTypeRequest
} from "@/lib/server/api/mapObjectRequest";
import { rateLimitReward } from "@/lib/server/api/rateLimit";
import { readRequestBody } from "@/lib/server/api/requestBody";
import { respond } from "@/lib/server/api/respond";
import {
	type FortQueryEntry,
	type FortType,
	fortTypes,
	queryFortsCombined
} from "@/lib/server/queryMapObjects/queryMapObjects";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const log = getLogger("mapobjects");

// Gyms, pokéstops and stations in one request: each type is admitted, resolved, charged and
// answered exactly as /api/<type> would, around a single combined Golbat scan. A type's status
// is the status the single-type route would have answered with (400, 401, 409 or 429); a type
// whose query failed is refunded in full and left out of the response entirely.
export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const rateLimitKey = locals.user?.id ?? getClientAddress();
	const start = performance.now();

	let data: FortsRequestData;
	try {
		data = await readRequestBody(request);
	} catch {
		error(400);
	}
	if (!isValidBounds(data) || !data.types || typeof data.types !== "object") error(400);
	const bounds = {
		minLat: data.minLat,
		minLon: data.minLon,
		maxLat: data.maxLat,
		maxLon: data.maxLon
	};

	const entries: Partial<Record<FortType, FortQueryEntry>> = {};
	const statuses: Partial<Record<FortType, 400 | 401 | 409 | 429>> = {};
	const admitted: Partial<
		Record<
			FortType,
			{ requestLimit: number; totalLimit: number; since?: number; filterCached?: "0" | "1" }
		>
	> = {};

	const requested = fortTypes.filter((type) => {
		const typeData = data.types[type];
		return Boolean(typeData) && typeof typeData === "object";
	});
	// Each type's rate limiter is independent, so admit + resolve run concurrently across types
	// (sequentially within a type, since resolving needs the admitted request limit).
	await Promise.all(
		requested.map(async (type) => {
			const typeData = data.types[type]!;
			const admit = await admitType(type, locals, rateLimitKey);
			if (admit.status !== 200) {
				statuses[type] = admit.status;
				return;
			}
			const resolved = await resolveTypeRequest(
				type,
				locals,
				rateLimitKey,
				admit.requestLimit,
				bounds,
				typeData
			);
			if (resolved.status !== 200) {
				statuses[type] = resolved.status;
				return;
			}
			const since = requestSince(typeData);
			entries[type] = {
				filter: resolved.filter,
				bounds: resolved.permitted.bounds,
				polygon: resolved.permitted.polygon,
				since,
				limit: admit.requestLimit,
				context: resolved.context
			};
			admitted[type] = {
				requestLimit: admit.requestLimit,
				totalLimit: admit.totalLimit,
				since,
				filterCached: resolved.filterCached
			};
		})
	);
	const permCheckTime = performance.now();

	const queried = fortTypes.filter((type) => entries[type]);
	const results = await queryFortsCombined(entries).catch(async (e) => {
		await Promise.all(
			queried.map((type) => rateLimitReward(rateLimitKey, admitted[type]!.requestLimit, type))
		);
		throw e;
	});

	const summary = await Promise.all(
		queried.map(async (type) => {
			const a = admitted[type]!;
			const result = results[type];
			// queryFortsCombined leaves a type out when its query failed: refund it in full and
			// omit it from the response, so the client sees it as missing rather than as empty.
			if (!result) {
				await rateLimitReward(rateLimitKey, a.requestLimit, type);
				return `${type}: query failed (refunded ${a.requestLimit})`;
			}
			const { charge, remainingPoints } = await settleTypeRequest(
				type,
				rateLimitKey,
				a.requestLimit,
				a.since,
				result
			);
			return `${type}: ${result.data.length} (charged ${charge}, ${remainingPoints}/${a.totalLimit})`;
		})
	);

	const response: FortsResponse = {};
	for (const type of fortTypes) {
		const status = statuses[type];
		if (status !== undefined) {
			response[type] = { status };
			continue;
		}
		const result = results[type];
		if (result) {
			response[type] = { status: 200, filterCached: admitted[type]!.filterCached, result };
		}
	}

	const queryTime = performance.now();
	const httpResponse = respond(request, response);
	const serializeTime = performance.now();

	log.info(
		"[forts] %s | permcheck: %fms + query: %fms + serialize: %fms",
		summary.join(" | ") || "nothing admitted",
		(permCheckTime - start).toFixed(1),
		(queryTime - permCheckTime).toFixed(1),
		(serializeTime - queryTime).toFixed(1)
	);

	return httpResponse;
};
