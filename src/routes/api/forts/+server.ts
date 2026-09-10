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
// answered exactly as /api/<type> would, around a single combined Golbat scan.
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

	const response: FortsResponse = {};
	const entries: Partial<Record<FortType, FortQueryEntry>> = {};
	const admitted: Partial<
		Record<
			FortType,
			{ requestLimit: number; totalLimit: number; since?: number; filterCached?: "0" | "1" }
		>
	> = {};

	for (const type of fortTypes) {
		const typeData = data.types[type];
		if (!typeData || typeof typeData !== "object") continue;

		const admit = await admitType(type, locals, rateLimitKey);
		if (admit.status !== 200) {
			response[type] = { status: admit.status };
			continue;
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
			response[type] = { status: resolved.status === 400 ? 409 : resolved.status };
			continue;
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
	}
	const permCheckTime = performance.now();

	const queried = fortTypes.filter((type) => entries[type]);
	const results = await queryFortsCombined(entries).catch(async (e) => {
		await Promise.all(
			queried.map((type) => rateLimitReward(rateLimitKey, admitted[type]!.requestLimit, type))
		);
		throw e;
	});

	const summary: string[] = [];
	for (const type of queried) {
		const result = results[type] ?? { examined: 0, data: [] };
		const a = admitted[type]!;
		const { charge, remainingPoints } = await settleTypeRequest(
			type,
			rateLimitKey,
			a.requestLimit,
			a.since,
			result
		);
		response[type] = { status: 200, filterCached: a.filterCached, result };
		summary.push(
			`${type}: ${result.data.length} (charged ${charge}, ${remainingPoints}/${a.totalLimit})`
		);
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
