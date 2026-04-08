import { type IRateLimiterOptions, RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { allMapObjectTypes, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("ratelimit");
const enabled = getServerConfig()?.limits?.enableRateLimiting ?? false;
const limitsConfig = getServerConfig().limits;

const REQUEST_COST_SINCE_FRESH_WINDOW = 60;
const NON_DELTA_MULTIPLIER = limitsConfig?.nonDeltaMultiplier ?? 3;
const HEAVY_FILTER_MULTIPLIER = limitsConfig?.heavyFilterMultiplier ?? 2;
const HEAVY_FILTER_RATIO = limitsConfig?.heavyFilterRatio ?? 0.2;

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

const mapObjectLimiters = new Map<MapObjectType, RateLimiterMemory>(
	allMapObjectTypes.map((type) => {
		const typeConfig = limitsConfig?.[type];

		let points = typeConfig?.rateLimit;
		if (!points) {
			points = (typeConfig?.requestLimit ?? requestLimits[type] ?? 10_000) * 200;
		}

		return [
			type,
			new RateLimiterMemory({
				points,
				duration: typeConfig?.rateLimitTime ?? 60 * 60,
				keyPrefix: type + "_"
			})
		];
	})
);

function beforeNext(timestamp: number): Record<string, string> {
	return {
		"Retry-After": timestamp.toString()
	};
}

function getHeaders(data: RateLimiterRes): Record<string, string> {
	return beforeNext(Math.ceil(data.msBeforeNext / 1000));
}

function getLimiter(type: MapObjectType): RateLimiterMemory {
	const limiter = mapObjectLimiters.get(type);
	if (!limiter) throw new Error("Limiter of type " + type + " does not exist");
	return limiter;
}

export function calculateRequestCharge(
	since: number | undefined,
	queried: number,
	examined: number
): number {
	// this uses examined, which is fine.
	// but: pokemon-examined will always have total count, while sql objects in delta queries
	// do not. this creates a big discrepency here.
	const now = currentTimestamp();

	let isDelta = Boolean(since && since > now - REQUEST_COST_SINCE_FRESH_WINDOW);

	const baseUsage = Math.max(0, examined);
	const sinceMultiplier = !isDelta ? NON_DELTA_MULTIPLIER : 1;

	const isHeavilyFiltered = !isDelta && examined > 0 && queried < examined * HEAVY_FILTER_RATIO;
	const filterMultiplier = isHeavilyFiltered ? HEAVY_FILTER_MULTIPLIER : 1;

	const totalMultiplier = sinceMultiplier * filterMultiplier;
	const charge = Math.ceil(baseUsage * totalMultiplier);

	log.debug(
		"Rate limit charge: %d | data: %d/%d, isDelta: %s, isHeavilyFiltered: %s",
		charge,
		queried,
		examined,
		isDelta,
		isHeavilyFiltered
	);

	return charge;
}

export async function rateLimitConsume(
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

export async function rateLimitReward(
	key: string,
	points: number,
	type?: MapObjectType
): Promise<number> {
	if (!enabled || points <= 0) return 1;

	const limiter = getLimiter(type);
	const result = await limiter.reward(key, points);
	return result.remainingPoints;
}

export async function rateLimit(
	key: string,
	points: number,
	type?: MapObjectType
): Promise<number> {
	if (!enabled || points <= 0) return 1;

	const limiter = getLimiter(type);
	const result = await limiter.penalty(key, points);
	return result.remainingPoints;
}
