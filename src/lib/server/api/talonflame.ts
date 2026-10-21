import { getServerConfig } from "@/lib/services/config/config.server";
import { error } from "@sveltejs/kit";
import type { MultiPolygon, Polygon } from "geojson";

export type TalonflameNest = {
	id: string;
	pokemon_id: number;
	form: number;
	name: string;
	area_name: string;
	lat: number;
	lon: number;
	spawnpoints: number;
	m2: number;
	last_changed: number | null;
	geometry: Polygon | MultiPolygon;
};
export type TalonflameResponse = {
	revision: string;
	snapshot: true;
	examined: number;
	limitReached?: boolean;
	data: TalonflameNest[];
};

type CacheEntry = { value: unknown; etag: string | null; expires: number; bytes: number };
const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<unknown>>();
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
let cachedBytes = 0;

// Shared per worker, bounded by both bytes and entries. Identical concurrent
// requests share one upstream call; expired entries are revalidated by ETag.
export async function fetchTalonflame<T>(path: string, thisFetch = fetch): Promise<T> {
	const base = getServerConfig().talonflame?.url;
	if (!base) error(503, "Talonflame URL is not configured");
	const url = `${base.replace(/\/$/, "")}/api/map/nests${path}`;
	const existing = cache.get(url);
	if (existing && existing.expires > Date.now()) {
		cache.delete(url);
		cache.set(url, existing);
		return existing.value as T;
	}
	const inFlight = pending.get(url);
	if (inFlight) return inFlight as Promise<T>;
	if (pending.size >= 128) error(503, "Talonflame request queue is full");
	const request = (async () => {
		const response = await thisFetch(url, {
			headers: existing?.etag ? { "If-None-Match": existing.etag } : undefined,
			signal: AbortSignal.timeout(10_000)
		});
		if (response.status === 304 && existing) {
			existing.expires = Date.now() + 5000;
			return existing.value as T;
		}
		if (!response.ok) error(502, `Talonflame returned ${response.status}`);
		const text = await response.text();
		const value = JSON.parse(text) as T;
		if (existing && cache.delete(url)) cachedBytes -= existing.bytes;
		const bytes = Buffer.byteLength(text);
		if (bytes <= MAX_CACHE_BYTES) {
			while (cache.size >= 128 || cachedBytes + bytes > MAX_CACHE_BYTES) {
				const oldest = cache.keys().next().value!;
				cachedBytes -= cache.get(oldest)!.bytes;
				cache.delete(oldest);
			}
			cache.set(url, {
				value,
				etag: response.headers.get("ETag"),
				expires: Date.now() + 5000,
				bytes
			});
			cachedBytes += bytes;
		}
		return value;
	})();
	pending.set(url, request);
	try {
		return await request;
	} finally {
		pending.delete(url);
	}
}

export async function fetchTalonflameStats() {
	const response = await fetchTalonflame<{
		data: { pokemon_id: number; form: number; count: number }[];
	}>("/stats");
	return response.data;
}
