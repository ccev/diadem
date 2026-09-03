import type { AnyFilter } from "@/lib/features/filters/filters";
import TTLCache from "@isaacs/ttlcache";

const FILTER_CACHE_TTL = 30 * 60 * 1000;
const FILTER_CACHE_MAX = 1000;
const MAX_CACHED_FILTER_BYTES = 16 * 1024;
const filterCache = new TTLCache<string, AnyFilter>({
	ttl: FILTER_CACHE_TTL,
	max: FILTER_CACHE_MAX
});

export function rememberFilter(hash: string, filter: AnyFilter): boolean {
	const serialized = JSON.stringify(filter);
	if (Buffer.byteLength(serialized) > MAX_CACHED_FILTER_BYTES) return false;
	filterCache.set(hash, filter);
	return true;
}

export function recallFilter(hash: string): AnyFilter | undefined {
	return filterCache.get(hash);
}
