import { type IRateLimiterOptions, RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { allMapObjectTypes, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getServerConfig } from "@/lib/services/config/config.server";

const enabled = getServerConfig()?.limits?.enableRateLimiting ?? true;
const limitsConfig = getServerConfig().limits;

const defaultRequestLimits: Record<MapObjectType, number> = {
	[MapObjectType.POKEMON]: 10_000,
	[MapObjectType.POKESTOP]: 10_000,
	[MapObjectType.GYM]: 10_000,
	[MapObjectType.STATION]: 10_000,
	[MapObjectType.NEST]: 10_000,
	[MapObjectType.SPAWNPOINT]: 50_000,
	[MapObjectType.ROUTE]: 10_000,
	[MapObjectType.TAPPABLE]: 10_000,
	[MapObjectType.S2_CELL]: 5_000
};

export const requestLimits: Record<MapObjectType, number> = Object.fromEntries(
	allMapObjectTypes.map((type) => [
		type,
		limitsConfig?.[type]?.requestLimit ?? defaultRequestLimits[type]
	])
) as Record<MapObjectType, number>;

const defaultOpts: IRateLimiterOptions = {
	points: 10_000_000,
	duration: 60 * 60 * 3 // 3 hours
};

const mapObjectLimiters = new Map<MapObjectType, RateLimiterMemory>(
	allMapObjectTypes.map((type) => {
		const typeConfig = limitsConfig?.[type];

		let points = typeConfig?.rateLimit;
		if (!points) {
			points = (typeConfig?.requestLimit ?? requestLimits[type] ?? 10_000) * 10_000;
		}

		return [
			type,
			new RateLimiterMemory({
				points,
				duration: typeConfig?.rateLimitTime ?? 60 * 60 * 3,
				keyPrefix: type + "_"
			})
		];
	})
);

const rateLimiter = new RateLimiterMemory(defaultOpts);

function beforeNext(timestamp: number): Record<string, string> {
	return {
		"Retry-After": timestamp.toString()
	};
}

function getHeaders(data: RateLimiterRes): Record<string, string> {
	return beforeNext(Math.ceil(data.msBeforeNext / 1000));
}

function getLimiter(type?: MapObjectType): RateLimiterMemory {
	if (type) return mapObjectLimiters.get(type) ?? rateLimiter;
	return rateLimiter;
}

export async function consumeRateLimit(
	key: string,
	points: number,
	type?: MapObjectType
): Promise<[boolean, number, number, Record<string, string>]> {
	if (!enabled) return [true, 1, 1, {}];

	const limiter = getLimiter(type);

	try {
		const data = await limiter.consume(key, points);
		return [true, data.remainingPoints, limiter.points, getHeaders(data)];
	} catch (e) {
		const data = e as RateLimiterRes;
		const headers =
			typeof data?.msBeforeNext === "number" ? getHeaders(data) : beforeNext(currentTimestamp());
		return [false, data.remainingPoints ?? 0, limiter.points, headers];
	}
}

export async function rewardRateLimit(
	key: string,
	points: number,
	type?: MapObjectType
): Promise<void> {
	if (!enabled || points <= 0) return;

	const limiter = getLimiter(type);
	await limiter.reward(key, points);
}
