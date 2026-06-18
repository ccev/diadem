import { getClientConfig } from "@/lib/services/config/config.server";
import { reverseAddress } from "@/lib/services/geocoding.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("push");

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const CACHE_MAX = 5000;
const cache = new Map<string, { address: string | null; expiresAt: number }>();

/**
 * Reverse-geocode coordinates for a push notification, cached and rounded to
 * ~11m precision so nearby spawns share a lookup. Returns null when no
 * geocoder is configured or the lookup fails (caller should omit the address).
 */
export async function getPushAddress(lat: number, lon: number): Promise<string | null> {
	const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
	const now = Date.now();
	const hit = cache.get(key);
	if (hit && hit.expiresAt > now) return hit.address;

	const lang = getClientConfig().general.defaultLocale ?? "en";
	let address: string | null = null;
	try {
		address = await reverseAddress(lat, lon, lang);
	} catch (err) {
		log.warning(`reverse geocode failed for ${key}: ${err}`);
	}

	if (cache.size >= CACHE_MAX) {
		for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k);
		if (cache.size >= CACHE_MAX) {
			const first = cache.keys().next().value;
			if (first !== undefined) cache.delete(first);
		}
	}
	cache.set(key, { address, expiresAt: now + CACHE_TTL_MS });
	return address;
}
