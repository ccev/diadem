import {
	combinedGolbatFortTypes,
	type FortType,
	type FortsRequestData,
	type FortsResponse
} from "@/lib/mapObjects/combinedForts";
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
import { type FortQueryEntry, combinedForts } from "@/lib/server/queryMapObjects/combinedForts";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const log = getLogger("mapobjects");

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
	const response: FortsResponse = {};
	const entries: Partial<
		Record<FortType, FortQueryEntry & { totalLimit: number; filterCached?: "0" | "1" }>
	> = {};

	await Promise.all(
		combinedGolbatFortTypes.map(async (type) => {
			const typeData = data.types[type];
			if (!typeData || typeof typeData !== "object") return;
			const admit = await admitType(type, locals, rateLimitKey);
			if (admit.status !== 200) {
				response[type] = { status: admit.status };
				return;
			}
			const resolved = await resolveTypeRequest(
				type,
				locals,
				rateLimitKey,
				admit.requestLimit,
				data,
				typeData
			);
			if (resolved.status !== 200) {
				response[type] = { status: resolved.status };
				return;
			}
			entries[type] = {
				filter: resolved.filter,
				bounds: resolved.permitted.bounds,
				polygon: resolved.permitted.polygon,
				since: requestSince(typeData),
				limit: admit.requestLimit,
				context: resolved.context,
				totalLimit: admit.totalLimit,
				filterCached: resolved.filterCached
			};
		})
	);
	const permCheckTime = performance.now();

	const queried = combinedGolbatFortTypes.filter((type) => entries[type]);
	const results = await combinedForts(entries).catch(async (e) => {
		await Promise.all(
			queried.map((type) => rateLimitReward(rateLimitKey, entries[type]!.limit, type))
		);
		throw e;
	});

	const summary = await Promise.all(
		queried.map(async (type) => {
			const { limit, totalLimit, since, filterCached } = entries[type]!;
			const result = results[type];
			if (!result) {
				await rateLimitReward(rateLimitKey, limit, type);
				return `${type}: query failed (refunded ${limit})`;
			}
			const { charge, remainingPoints } = await settleTypeRequest(
				type,
				rateLimitKey,
				limit,
				since,
				result
			);
			response[type] = { status: 200, filterCached, result };
			return `${type}: ${result.data.length} (charged ${charge}, ${remainingPoints}/${totalLimit})`;
		})
	);

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
