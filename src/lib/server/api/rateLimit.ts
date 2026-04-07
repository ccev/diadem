import { type IRateLimiterOptions, RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { allMapObjectTypes, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getServerConfig } from "@/lib/services/config/config.server";

type RateLimitReturn = Promise<[number, number, Record<string, string>]>

const enabled = getServerConfig()?.limits?.enableRateLimiting ?? true
const limitsConfig = getServerConfig().limits;

const defaultRequestLimits: Record<MapObjectType, number> = {
	[MapObjectType.POKEMON]: 10000,
	[MapObjectType.POKESTOP]: 10000,
	[MapObjectType.GYM]: 10000,
	[MapObjectType.STATION]: 10000,
	[MapObjectType.NEST]: 10000,
	[MapObjectType.SPAWNPOINT]: 50000,
	[MapObjectType.ROUTE]: 10000,
	[MapObjectType.TAPPABLE]: 10000,
	[MapObjectType.S2_CELL]: 5000
};

export const requestLimits: Record<MapObjectType, number> = Object.fromEntries(
	allMapObjectTypes.map((type) => [
		type,
		limitsConfig?.[type]?.requestLimit ?? defaultRequestLimits[type]
	])
) as Record<MapObjectType, number>;

const defaultOpts: IRateLimiterOptions = {
	points: 10_000_000,
	duration: 60 * 60 * 3  // 3 hours
};

const mapObjectLimiters = new Map<MapObjectType, RateLimiterMemory>(
	allMapObjectTypes.map((type) => {
		const typeConfig = limitsConfig?.[type];

		let points = typeConfig?.rateLimit
		if (!points) {
			points = (typeConfig?.requestLimit ?? requestLimits[type] ?? 10_000) * 10_000
		}

		return [type, new RateLimiterMemory({
			points,
			duration: typeConfig?.rateLimitTime ?? 60 * 60 * 3,
			keyPrefix: type + "_"
		})];
	})
);

const rateLimiter = new RateLimiterMemory(defaultOpts);

function beforeNext(timestamp: number): Record<string, string> {
	return {
		"Retry-After": timestamp.toString()
	};
}

function getHeaders(data: RateLimiterRes): Record<string, string> {
	return beforeNext(data.msBeforeNext / 1000)
}

function getLimiter(type?: MapObjectType): RateLimiterMemory {
	if (type) return mapObjectLimiters.get(type) ?? rateLimiter;
	return rateLimiter;
}

export async function rateLimit(key: string, points: number, type?: MapObjectType): RateLimitReturn {
	if (!enabled) return [1, 1, {}]
	const limiter = getLimiter(type);
	const data = await limiter.penalty(key, points);
	return [data.remainingPoints, limiter.points, getHeaders(data)];
}

export async function isRateLimited(key: string, type?: MapObjectType): RateLimitReturn {
	if (!enabled) return [1, 1, {}];
	const limiter = getLimiter(type);
	const data = await limiter.get(key);
	if (!data) return [limiter.points, limiter.points, beforeNext(0)];
	return [data.remainingPoints, limiter.points, getHeaders(data)];
}