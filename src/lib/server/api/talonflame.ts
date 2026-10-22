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

type CacheEntry = {
	value: unknown;
	etag: string | null;
	expiresAt: number;
	bytes: number;
};

const CACHE_TTL_MS = 5_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_CACHE_ENTRIES = 128;
const MAX_PENDING_REQUESTS = 128;
const MAX_CACHE_BYTES = 32 * 1024 * 1024;

const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();
let cachedBytes = 0;

function deleteCacheEntry(url: string) {
	const entry = cache.get(url);
	if (!entry) return;

	cache.delete(url);
	cachedBytes -= entry.bytes;
}

export async function fetchTalonflame<T>(path: string, thisFetch = fetch): Promise<T> {
	const baseUrl = getServerConfig().talonflame?.url;
	if (!baseUrl) error(503, "Talonflame URL is not configured");

	const url = `${baseUrl.replace(/\/$/, "")}/api/map/nests${path}`;
	const cached = cache.get(url);
	if (cached && cached.expiresAt > Date.now()) {
		cache.delete(url);
		cache.set(url, cached);
		return cached.value as T;
	}

	const inFlight = pendingRequests.get(url);
	if (inFlight) return inFlight as Promise<T>;
	if (pendingRequests.size >= MAX_PENDING_REQUESTS) error(503, "Talonflame request queue is full");

	const headers: Record<string, string> = {};
	if (cached?.etag) {
		headers["If-None-Match"] = cached.etag;
	}

	const request = thisFetch(url, {
		headers,
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
	})
		.then(async (response) => {
			if (response.status === 304 && cached) {
				cached.expiresAt = Date.now() + CACHE_TTL_MS;
				return cached.value as T;
			}
			if (!response.ok) error(502, `Talonflame returned ${response.status}`);

			const text = await response.text();
			const value = JSON.parse(text) as T;
			const bytes = Buffer.byteLength(text);
			deleteCacheEntry(url);
			if (bytes > MAX_CACHE_BYTES) return value;

			for (const cachedUrl of cache.keys()) {
				if (cache.size < MAX_CACHE_ENTRIES && cachedBytes + bytes <= MAX_CACHE_BYTES) break;
				deleteCacheEntry(cachedUrl);
			}
			cache.set(url, {
				value,
				etag: response.headers.get("ETag"),
				expiresAt: Date.now() + CACHE_TTL_MS,
				bytes
			});
			cachedBytes += bytes;
			return value;
		})
		.finally(() => pendingRequests.delete(url));

	pendingRequests.set(url, request);
	return request;
}

export async function fetchTalonflameStats() {
	const response = await fetchTalonflame<{
		data: { pokemon_id: number; form: number; count: number }[];
	}>("/stats");
	return response.data;
}
