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
import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";

export type MapObjectRequestData = Bounds & {
	filter?: AnyFilter | undefined;
	filterHash?: string;
	since?: number;
};

const STATUS_FILTER_UNKNOWN = 409;

/** Hashes that keep missing (another process may hold the cache) — always send in full. */
const alwaysSendFilterHashes = new Set<string>();

/** Hashes the server refused to cache (filter too large) — omit the hash entirely. */
const uncacheableFilterHashes = new Set<string>();

/** Hashes the server is known to hold — poll by hash alone. */
const knownFilterHashes = new Set<string>();

/** Consecutive misses per hash; past this we fall back to always sending it. */
const filterHashMisses = new Map<string, number>();
const MAX_FILTER_HASH_MISSES = 3;

/** Keyed like the server cache (client, type, hash). */
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
	// Server won't cache it; sending the hash would only make it re-hash.
	const filterHash = key !== undefined && uncacheableFilterHashes.has(key) ? undefined : hash;

	async function post(withFilter: boolean): Promise<Response> {
		// Re-hash at send time: `filter` is a live object that could change mid-409.
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
		// First use and known misses send in full; otherwise poll by hash alone.
		const sendFilter =
			filterHash === undefined ||
			key === undefined ||
			!knownFilterHashes.has(key) ||
			alwaysSendFilterHashes.has(key);

		let response = await post(sendFilter);
		if (response.status === STATUS_FILTER_UNKNOWN) {
			if (key !== undefined) recordFilterHashMiss(key);
			await response.body?.cancel(); // never read; leaving it open holds the connection
			response = await post(true);
		} else if (key !== undefined && !sendFilter && response.ok) {
			// Only a successful hash-only poll proves the misses are over.
			filterHashMisses.delete(key);
		}

		if (key !== undefined) {
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
		} else if (type === MapObjectType.ROUTE) {
			filter = getUserSettings().filters.route;
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
		const selected = getCurrentSelectedData();
		const preserveRoutesForFortPopup =
			type === MapObjectType.ROUTE &&
			(selected?.type === MapObjectType.POKESTOP || selected?.type === MapObjectType.GYM);
		if (preserveRoutesForFortPopup) return;

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
		const loadRoutes = [MapObjectType.POKESTOP, MapObjectType.GYM].includes(activeSearch.mapObject);
		for (const mapObjectType of allMapObjectTypes) {
			if (
				mapObjectType !== activeSearch.mapObject &&
				(mapObjectType !== MapObjectType.ROUTE || !loadRoutes)
			)
				clearMapObjects(mapObjectType);
		}
		const searchTypes = [activeSearch.mapObject];
		if (loadRoutes) searchTypes.push(MapObjectType.ROUTE);
		const results = await Promise.all(
			searchTypes.map((type) =>
				updateMapObject(
					type,
					removeOld,
					type === activeSearch.mapObject ? activeSearch.filter : undefined,
					controller.signal,
					onlyChanged
				)
			)
		);
		limitsToClear.push(...results.filter((type) => type !== undefined));
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
