import { getActiveSearch } from "@/lib/features/activeSearch.svelte.js";
import type { AnyFilter, FilterS2Cell } from "@/lib/features/filters/filters";
import { updateFeatures } from "@/lib/map/featuresGen.svelte";
import { getMap } from "@/lib/map/map.svelte";
import {
	clearAllDataLimits,
	clearDataLimit,
	getDataLimit,
	setDataLimit
} from "@/lib/mapObjects/dataLimitState.svelte";
import { type Bounds, getBounds } from "@/lib/mapObjects/mapBounds";
import {
	addMapObjects,
	clearAllMapObjects,
	clearMapObjects,
	getMapObjects,
	replaceMapObjects
} from "@/lib/mapObjects/mapObjectsState.svelte.js";
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getS2CellMapObjects } from "@/lib/mapObjects/s2cells.js";
import { updateWeather } from "@/lib/mapObjects/weather.svelte";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import { hasAnyFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
import { featureFamily } from "@/lib/utils/features";
import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { getFilterHash } from "@/lib/utils/filterHash";
import { encodeRequestBody, getHeaders, parseResponse } from "@/lib/utils/requests";
import { SvelteMap } from "svelte/reactivity";

export type MapObjectRequestData = Bounds & {
	filter?: AnyFilter | undefined;
	/** Stable hash of `filter`. When set without `filter`, the server uses its cached copy. */
	filterHash?: string;
	since?: number;
};

/** The server has no cached filter for the sent hash and wants a full resend. */
const STATUS_FILTER_UNKNOWN = 409;

/**
 * Hashes to stop asking about, because asking has repeatedly come back as a
 * miss — which is what a multi-process deployment without sticky routing looks
 * like, since each process caches separately. The filter goes out in full, but
 * the hash still goes with it so the process that answers can cache it.
 */
const alwaysSendFilterHashes = new Set<string>();

/**
 * Hashes the server has said it will never cache, because the filter is too
 * large. The hash is left out of the request entirely for these: sending it
 * would only make the server hash and serialize the filter again on every poll
 * to reach the same conclusion, and throw both away.
 */
const uncacheableFilterHashes = new Set<string>();

/**
 * Hashes the server has answered for. A filter it has never seen is sent in
 * full the first time — asking by hash first would 409 and resend, so every
 * page load and every filter edit would cost two serialized requests per type
 * on the most latency-sensitive path there is.
 */
const knownFilterHashes = new Set<string>();

/** Consecutive misses per hash, and how many are tolerated before giving up on it. */
const filterHashMisses = new Map<string, number>();
const MAX_FILTER_HASH_MISSES = 3;

/**
 * The server caches per (client, map object type, hash), so this bookkeeping is
 * keyed the same way. Sharing an entry between types would let a hit for one
 * send the other hash-only into a 409, and let that miss count against both.
 */
function hashKey(type: MapObjectType, hash: string): string {
	return type + " " + hash;
}

let currentController: AbortController | undefined;
const lastQueryTimestamps = new SvelteMap<MapObjectType, number>();

export function resetLastQueryTimestamps() {
	lastQueryTimestamps.clear();
}

export function getLastQueryTimestamps() {
	return lastQueryTimestamps;
}

/** A hash the server keeps failing to resolve isn't worth asking about again. */
function recordFilterHashMiss(hash: string) {
	const misses = (filterHashMisses.get(hash) ?? 0) + 1;
	if (misses >= MAX_FILTER_HASH_MISSES) {
		alwaysSendFilterHashes.add(hash);
		knownFilterHashes.delete(hash);
		filterHashMisses.delete(hash);
		return;
	}
	filterHashMisses.set(hash, misses);
}

export function clearMap() {
	// TODO: Also do this on login
	clearAllMapObjects();
	resetLastQueryTimestamps();
	clearAllDataLimits();
	// What the server holds for us is no longer worth assuming after a reset,
	// and these would otherwise grow for the life of the page.
	knownFilterHashes.clear();
	alwaysSendFilterHashes.clear();
	uncacheableFilterHashes.clear();
	filterHashMisses.clear();
	updateFeatures(getMapObjects());
}

export async function fetchMapObjects<T extends MapData>(
	type: MapObjectType,
	bounds: Bounds,
	filter: AnyFilter | undefined = undefined,
	signal?: AbortSignal,
	since?: number
): Promise<MapObjectResponse<T> | undefined> {
	const currentBounds = getBounds();
	const hash = getFilterHash(filter);
	const key = hash === undefined ? undefined : hashKey(type, hash);
	// Omitted when the server has told us it won't cache this filter, so it does
	// no hashing work for an answer both sides already know.
	const filterHash = key !== undefined && uncacheableFilterHashes.has(key) ? undefined : hash;

	async function post(withFilter: boolean): Promise<Response> {
		// Re-hashed at send time when the filter goes with it. `filter` is the live
		// reactive object, so a user editing it during a 409 round trip would
		// otherwise have the retry carry the new filter under the old hash — the
		// server rejects that pairing and the client concludes, permanently, that
		// the filter cannot be cached.
		const body: MapObjectRequestData = {
			...currentBounds,
			filter: withFilter ? filter : undefined,
			filterHash: withFilter ? getFilterHash(filter) : filterHash,
			since
		};
		const encoded = encodeRequestBody(body);
		return await fetch("/api/" + type, {
			method: "POST",
			body: encoded.body,
			headers: getHeaders({ msgpack: true, contentType: encoded.contentType, clientId: true }),
			signal
		});
	}

	try {
		// Send the filter the first time it is used and whenever asking by hash has
		// proven not to work; poll by hash alone once the server is known to hold it.
		const sendFilter =
			filterHash === undefined ||
			key === undefined ||
			!knownFilterHashes.has(key) ||
			alwaysSendFilterHashes.has(key);

		let response = await post(sendFilter);
		// The server dropped it — a restart, the cache expiring, or another process
		// in a multi-worker deployment that has not seen this filter yet.
		if (response.status === STATUS_FILTER_UNKNOWN) {
			if (key !== undefined) recordFilterHashMiss(key);
			// The 409 body is never read; leaving it open holds its connection.
			await response.body?.cancel();
			response = await post(true);
			// The retry succeeding says nothing about whether hashing works here,
			// so the run of misses stands until a hash-only poll is answered.
		} else if (key !== undefined && !sendFilter && response.ok) {
			// Only a hash-only poll that actually succeeded proves the miss run is
			// over. A 429 or a 500 says nothing, and counting those as recoveries
			// would keep resetting the run on a server that is shedding load — the
			// case the always-send fallback exists to escape.
			filterHashMisses.delete(key);
		}

		if (key !== undefined) {
			// Checked on any response rather than only a success. The server can
			// only produce it alongside one today, but reading it unconditionally
			// costs nothing and does not go stale if that changes.
			if (response.headers.get("X-Filter-Cached") === "0") {
				uncacheableFilterHashes.add(key);
				knownFilterHashes.delete(key);
			} else if (response.ok && filterHash !== undefined) {
				knownFilterHashes.add(key);
			}
		}

		return await parseResponse<MapObjectResponse<T>>(response);
	} catch (e) {
		if (e instanceof DOMException && e.name === "AbortError") {
			return;
		}
		console.error(`Error while fetching ${type}`, e);
	}
}

export async function updateMapObject(
	type: MapObjectType,
	removeOld: boolean = true,
	filterOverwrite: AnyFilter | undefined = undefined,
	signal?: AbortSignal,
	onlyChanged: boolean = false
) {
	if (!hasAnyFeatureAnywhere(getUserDetails().permissions, featureFamily[type])) return;
	if (type === MapObjectType.ROUTE) return;

	let filter: AnyFilter | undefined = undefined;

	if (filterOverwrite) {
		filter = filterOverwrite;
	} else {
		if (type === MapObjectType.POKEMON) {
			filter = getUserSettings().filters.pokemon;
		} else if (type === MapObjectType.POKESTOP) {
			filter = getUserSettings().filters.pokestop;
		} else if (type === MapObjectType.GYM) {
			filter = getUserSettings().filters.gym;
		} else if (type === MapObjectType.STATION) {
			filter = getUserSettings().filters.station;
		} else if (type === MapObjectType.NEST) {
			filter = getUserSettings().filters.nest;
		} else if (type === MapObjectType.SPAWNPOINT) {
			filter = getUserSettings().filters.spawnpoint;
			// } else if (type === MapObjectType.ROUTE) {
			// 	filter = getUserSettings().filters.route;
		} else if (type === MapObjectType.TAPPABLE) {
			filter = getUserSettings().filters.tappable;
		} else if (type === MapObjectType.S2_CELL) {
			filter = getUserSettings().filters.s2cell;
		} else {
			console.log("unknown type while udpating map objects!");
			return;
		}
	}

	if (!filter || !filter.enabled) {
		clearMapObjects(type);
		clearDataLimit(type);
		if (!signal) updateFeatures(getMapObjects());
		return;
	}

	const limitInfo = getDataLimit(type);
	if (limitInfo) {
		// don't refetch a limited type until the map was zoomed in or its filters changed
		const zoomedIn = (getMap()?.getZoom() ?? 0) > limitInfo.zoom + 0.01;
		const filterChanged = JSON.stringify(filter) !== limitInfo.filterJson;
		if (!zoomedIn && !filterChanged) return;
	}

	const since = onlyChanged ? lastQueryTimestamps.get(type) : undefined;
	const isDelta = onlyChanged && since !== undefined;
	lastQueryTimestamps.set(type, currentTimestamp());

	let examined: number = 0;
	let data: MapData[] | undefined = undefined;
	let clearLimitAfterRender = false;
	if (type === MapObjectType.S2_CELL) {
		data = getS2CellMapObjects(getBounds(), filter as FilterS2Cell);
		examined = data.length;
	} else {
		const response = await fetchMapObjects(type, getBounds(), filter, signal, since);
		if (signal?.aborted) return;
		if (response) {
			if (response.limitReached) {
				setDataLimit(type, {
					zoom: getMap()?.getZoom() ?? 0,
					filterJson: JSON.stringify(filter)
				});
				data = [];
			} else {
				data = response.data;
				clearLimitAfterRender = Boolean(limitInfo);
			}
			examined = response.examined;
		}
	}

	if (!data) {
		if (!signal) updateFeatures(getMapObjects());
		return;
	}

	try {
		if (removeOld && !isDelta) {
			replaceMapObjects(data, type, examined);
		} else {
			addMapObjects(data, type, examined, isDelta);
		}
	} catch (e) {
		clearLimitAfterRender = false;
		console.log(data);
		console.error(e);
	}

	if (!signal) {
		updateFeatures(getMapObjects());
		if (clearLimitAfterRender) clearDataLimit(type);
	}

	return clearLimitAfterRender ? type : undefined;
}

export async function updateAllMapObjects(removeOld: boolean = true, onlyChanged: boolean = false) {
	if (onlyChanged && currentController) return;

	currentController?.abort();
	const controller = new AbortController();
	currentController = controller;

	const activeSearch = getActiveSearch();
	let limitsToClear: MapObjectType[] = [];

	if (activeSearch) {
		for (const mapObjectType of allMapObjectTypes) {
			if (mapObjectType !== activeSearch.mapObject) clearMapObjects(mapObjectType);
		}
		const limitToClear = await updateMapObject(
			activeSearch.mapObject,
			removeOld,
			activeSearch.filter,
			controller.signal,
			onlyChanged
		);
		if (limitToClear) limitsToClear.push(limitToClear);
	} else {
		const [limitResults] = await Promise.all([
			Promise.all(
				allMapObjectTypes.map((type) =>
					updateMapObject(type, removeOld, undefined, controller.signal, onlyChanged)
				)
			),
			updateWeather()
		]);
		limitsToClear = limitResults.filter((type) => type !== undefined);
	}

	if (controller.signal.aborted) return;
	currentController = undefined;
	updateFeatures(getMapObjects());
	for (const type of limitsToClear) clearDataLimit(type);
}
