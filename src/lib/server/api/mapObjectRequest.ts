import type { AnyFilter } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { recallFilter, rememberFilter } from "@/lib/server/api/filterCache";
import {
	calculateRequestCharge,
	rateLimit,
	rateLimitConsume,
	rateLimitReward,
	requestLimits
} from "@/lib/server/api/rateLimit";
import { hasAnyFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import {
	checkFeaturesInBounds,
	FeaturePermissionContext,
	type PermittedBounds
} from "@/lib/services/user/checkPerm";
import { featureFamily } from "@/lib/utils/features";
import { getFilterHash } from "@/lib/utils/filterHash";

const FILTER_HASH_PATTERN = /^[0-9a-f]{64}$/;
const DENIED_CHARGE = 100;

export type TypeRequestData = { filter?: AnyFilter; filterHash?: string; since?: number };

export function isValidBounds(data: unknown): data is Bounds {
	if (!data || typeof data !== "object" || Array.isArray(data)) return false;
	const b = data as Record<string, unknown>;
	return (
		Number.isFinite(b.minLat) &&
		Number.isFinite(b.maxLat) &&
		Number.isFinite(b.minLon) &&
		Number.isFinite(b.maxLon)
	);
}

export function requestSince(data: TypeRequestData): number | undefined {
	return Number.isFinite(data.since) ? data.since : undefined;
}

export async function admitType(type: MapObjectType, locals: App.Locals, rateLimitKey: string) {
	if (!hasAnyFeatureAnywhereServer(locals.perms, featureFamily[type], locals.user)) {
		return { status: 401 } as const;
	}
	const requestLimit = requestLimits[type];
	const [allowed, , totalLimit, headers] = await rateLimitConsume(rateLimitKey, requestLimit, type);
	if (!allowed) return { status: 429, headers, totalLimit } as const;
	return { status: 200, requestLimit, totalLimit } as const;
}

export async function refundDenied(
	type: MapObjectType,
	rateLimitKey: string,
	requestLimit: number
) {
	if (requestLimit > DENIED_CHARGE) {
		await rateLimitReward(rateLimitKey, requestLimit - DENIED_CHARGE, type);
	}
}

export async function resolveTypeRequest(
	type: MapObjectType,
	locals: App.Locals,
	rateLimitKey: string,
	requestLimit: number,
	bounds: Bounds,
	data: TypeRequestData
): Promise<
	| { status: 400 | 401 | 409 }
	| {
			status: 200;
			filter: AnyFilter | undefined;
			permitted: PermittedBounds;
			context: FeaturePermissionContext;
			filterCached?: "0" | "1";
	  }
> {
	const family = featureFamily[type];
	const permitted = checkFeaturesInBounds(locals.perms, family, bounds);
	if (!permitted) {
		await refundDenied(type, rateLimitKey, requestLimit);
		return { status: 401 };
	}

	const filterHash =
		typeof data.filterHash === "string" && FILTER_HASH_PATTERN.test(data.filterHash)
			? data.filterHash
			: undefined;
	if (data.filterHash !== undefined && !filterHash) {
		await refundDenied(type, rateLimitKey, requestLimit);
		return { status: 400 };
	}

	let filter = data.filter;
	let filterCached: "0" | "1" | undefined;
	if (filterHash) {
		if (filter) {
			filterCached =
				getFilterHash(filter) === filterHash && rememberFilter(filterHash, filter) ? "1" : "0";
		} else {
			filter = recallFilter(filterHash);
			if (!filter) {
				await refundDenied(type, rateLimitKey, requestLimit);
				return { status: 409 };
			}
		}
	}

	return {
		status: 200,
		filter,
		permitted,
		context: new FeaturePermissionContext(locals.perms, family),
		filterCached
	};
}

export async function settleTypeRequest(
	type: MapObjectType,
	rateLimitKey: string,
	requestLimit: number,
	since: number | undefined,
	result: MapObjectResponse<MapData>
) {
	const charge = calculateRequestCharge(
		since,
		result.data.length,
		Math.min(result.examined, requestLimits[type])
	);
	const refundPoints = requestLimit - charge;
	let remainingPoints = 1;
	if (refundPoints > 0) {
		remainingPoints = await rateLimitReward(rateLimitKey, refundPoints, type);
	} else if (refundPoints < 0) {
		remainingPoints = await rateLimit(rateLimitKey, -1 * refundPoints, type);
	}
	return { charge, remainingPoints };
}
