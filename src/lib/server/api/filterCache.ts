import type { AnyFilter } from "@/lib/features/filters/filters";
import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import TTLCache from "@isaacs/ttlcache";

/**
 * Caches a client's filters per (client, map object type) so polls carry a short
 * hash instead of the full filter JSON.
 *
 * A few filters per key: NAT-shared logged-out clients and toggling an active
 * search would evict each other every poll with a single slot.
 */
const FILTER_CACHE_TTL = 30 * 60 * 1000;
const FILTER_CACHE_MAX = 20_000;
const FILTERS_PER_KEY = 4;
/** Filters this large aren't cached; those clients resend instead. */
const MAX_CACHED_FILTER_BYTES = 16 * 1024;
/** Total retained filter bytes; oldest keys are evicted to stay under it. */
const FILTER_CACHE_BYTE_BUDGET = 16 * 1024 * 1024;

type CachedFilter = { filter: AnyFilter; bytes: number };

/** Retained bytes per cache, so one can't spend the other's budget. */
const cachedBytes = new Map<TTLCache<string, Map<string, CachedFilter>>, number>();

function newCache(max: number) {
	const cache: TTLCache<string, Map<string, CachedFilter>> = new TTLCache({
		ttl: FILTER_CACHE_TTL,
		max,
		// No updateAgeOnGet: a miss would register an expiry for a phantom key.
		// The TTL is refreshed explicitly on a hit in recallFilter instead.
		dispose: (filters) => {
			if (!filters) return;
			let total = cachedBytes.get(cache) ?? 0;
			for (const entry of filters.values()) total -= entry.bytes;
			cachedBytes.set(cache, total);
		}
	});
	cachedBytes.set(cache, 0);
	return cache;
}

const authedFilterCache = newCache(FILTER_CACHE_MAX);
const anonFilterCache = newCache(FILTER_CACHE_MAX);

function deepFreeze<T>(value: T): T {
	if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
	Object.freeze(value);
	for (const entry of Object.values(value)) deepFreeze(entry);
	return value;
}

function cacheKey(clientKey: string, type: MapObjectType): string {
	return clientKey + " " + type;
}

/** Anonymous clients can mint keys freely, so they get a cache of their own. */
function cacheFor(clientKey: string): TTLCache<string, Map<string, CachedFilter>> {
	return clientKey.startsWith("u:") ? authedFilterCache : anonFilterCache;
}

/** Returns false when the filter is too large to cache and must always be sent. */
export function rememberFilter(
	clientKey: string,
	type: MapObjectType,
	hash: string,
	filter: AnyFilter
): boolean {
	const serialized = JSON.stringify(filter);
	const bytes = Buffer.byteLength(serialized);
	if (bytes > MAX_CACHED_FILTER_BYTES) return false;

	// Freeze a copy, since the stored filter is reused across every poll.
	const stored = deepFreeze(JSON.parse(serialized)) as AnyFilter;

	const cache = cacheFor(clientKey);
	const key = cacheKey(clientKey, type);
	const filters = cache.get(key) ?? new Map<string, CachedFilter>();

	// Re-insert so this hash counts as the most recently used one.
	let total = cachedBytes.get(cache) ?? 0;
	total -= filters.get(hash)?.bytes ?? 0;
	filters.delete(hash);
	filters.set(hash, { filter: stored, bytes });
	total += bytes;

	while (filters.size > FILTERS_PER_KEY) {
		const oldest = filters.keys().next().value;
		if (oldest === undefined) break;
		total -= filters.get(oldest)?.bytes ?? 0;
		filters.delete(oldest);
	}

	cachedBytes.set(cache, total);
	cache.set(key, filters);
	evictToBudget(cache);
	return true;
}

/** TTLCache iterates soonest-to-expire first = oldest first here. */
function evictToBudget(cache: TTLCache<string, Map<string, CachedFilter>>) {
	while ((cachedBytes.get(cache) ?? 0) > FILTER_CACHE_BYTE_BUDGET) {
		const oldest = cache.keys().next().value;
		if (oldest === undefined) break;
		cache.delete(oldest);
	}
}

/** The cached filter for this hash, or undefined when the client must resend it. */
export function recallFilter(
	clientKey: string,
	type: MapObjectType,
	hash: string
): AnyFilter | undefined {
	const cache = cacheFor(clientKey);
	const key = cacheKey(clientKey, type);
	const filters = cache.get(key);
	const entry = filters?.get(hash);
	if (!filters || !entry) return undefined;

	// Re-insert so the actively polled hash is the last one evicted.
	filters.delete(hash);
	filters.set(hash, entry);
	// Hash-only polls never re-send the filter, so refresh the TTL on every hit.
	cache.setTTL(key, FILTER_CACHE_TTL);
	return entry.filter;
}
