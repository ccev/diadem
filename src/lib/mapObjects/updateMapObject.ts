import { getActiveSearch } from "@/lib/features/activeSearch.svelte.js";
import type { AnyFilter, FilterS2Cell } from "@/lib/features/filters/filters";
import { updateFeatures } from "@/lib/map/featuresGen.svelte";
import { getMap } from "@/lib/map/map.svelte";
import {
	clearAllDataLimits,
	clearDataLimit,
	type DataLimitInfo,
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
import {
	allMapObjectTypes,
	type QueryableMapData,
	MapObjectType
} from "@/lib/mapObjects/mapObjectTypes";
import { getS2CellMapObjects } from "@/lib/mapObjects/s2cells.js";
import { updateWeather } from "@/lib/mapObjects/weather.svelte";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import {
	combinedGolbatFortTypes,
	type FortType,
	type FortsRequestData,
	type FortsResponse
} from "@/lib/mapObjects/combinedForts";
import { hasAnyFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
import { featureFamily } from "@/lib/utils/features";
import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { getFilterHash } from "@/lib/utils/filterHash";
import { encodeRequestBody, getHeaders, parseResponse } from "@/lib/utils/requests";
import { SvelteMap } from "svelte/reactivity";
import { tick } from "svelte";
import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";

export type MapObjectRequestData = Bounds & {
	filter?: AnyFilter;
	filterHash?: string;
	since?: number;
};

export type MapObjectPlan = {
	type: MapObjectType;
	filter: AnyFilter;
	since?: number;
	isDelta: boolean;
	queryTimestamp: number;
	limitInfo?: DataLimitInfo;
	removeOld: boolean;
};

const STATUS_FILTER_UNKNOWN = 409;
const uncacheableFilterHashes = new Set<string>();
const knownFilterHashes = new Set<string>();

let currentController: AbortController | undefined;
const lastQueryTimestamps = new SvelteMap<MapObjectType, number>();

export function resetLastQueryTimestamps() {
	lastQueryTimestamps.clear();
}

export function getLastQueryTimestamps() {
	return lastQueryTimestamps;
}

export function cancelMapObjectRequests() {
	currentController?.abort();
	currentController = undefined;
}

export function clearMap() {
	// TODO: Also do this on login
	cancelMapObjectRequests();
	clearAllMapObjects();
	resetLastQueryTimestamps();
	clearAllDataLimits();
	knownFilterHashes.clear();
	uncacheableFilterHashes.clear();
	updateFeatures(getMapObjects());
}

function filterHashToSend(filter: AnyFilter | undefined) {
	const hash = getFilterHash(filter);
	const filterHash = hash !== undefined && uncacheableFilterHashes.has(hash) ? undefined : hash;
	const sendFilter = hash === undefined || !knownFilterHashes.has(hash);
	return { hash, filterHash, sendFilter };
}

function noteFilterCached(hash: string | undefined, cached: string | null | undefined) {
	if (hash === undefined) return;
	if (cached === "1") {
		knownFilterHashes.add(hash);
	} else if (cached === "0") {
		uncacheableFilterHashes.add(hash);
		knownFilterHashes.delete(hash);
	}
}

export async function fetchMapObjects<T extends QueryableMapData>(
	type: MapObjectType,
	bounds: Bounds,
	filter: AnyFilter | undefined = undefined,
	signal?: AbortSignal,
	since?: number
): Promise<MapObjectResponse<T> | undefined> {
	const { hash, filterHash, sendFilter } = filterHashToSend(filter);

	function post(withFilter: boolean): Promise<Response> {
		const body: MapObjectRequestData = {
			...bounds,
			filter: withFilter ? filter : undefined,
			filterHash,
			since
		};
		const encoded = encodeRequestBody(body);
		return fetch("/api/" + type, {
			method: "POST",
			body: encoded.body,
			headers: getHeaders(encoded.contentType),
			signal
		});
	}

	try {
		let response = await post(sendFilter);
		if (response.status === STATUS_FILTER_UNKNOWN && hash !== undefined && !sendFilter) {
			knownFilterHashes.delete(hash);
			await response.body?.cancel();
			response = await post(true);
		}

		noteFilterCached(hash, response.headers.get("X-Filter-Cached"));

		if (!response.ok) {
			console.error(`Error while fetching ${type}: ${response.status}`);
			return;
		}
		return await parseResponse<MapObjectResponse<T>>(response);
	} catch (e) {
		if (e instanceof DOMException && e.name === "AbortError") {
			return;
		}
		console.error(`Error while fetching ${type}`, e);
	}
}

export async function fetchForts(
	plans: MapObjectPlan[],
	bounds: Bounds,
	signal?: AbortSignal
): Promise<Map<MapObjectType, MapObjectResponse<QueryableMapData> | undefined>> {
	const results = new Map<MapObjectType, MapObjectResponse<QueryableMapData> | undefined>();
	const hashes = new Map<MapObjectType, string | undefined>();
	const body: FortsRequestData = { ...bounds, types: {} };
	for (const plan of plans) {
		const { hash, filterHash, sendFilter } = filterHashToSend(plan.filter);
		hashes.set(plan.type, hash);
		body.types[plan.type as FortType] = {
			filter: sendFilter ? plan.filter : undefined,
			filterHash,
			since: plan.since
		};
	}

	let parsed: FortsResponse | undefined;
	try {
		const encoded = encodeRequestBody(body);
		const response = await fetch("/api/forts", {
			method: "POST",
			body: encoded.body,
			headers: getHeaders(encoded.contentType),
			signal
		});
		if (response.ok) {
			parsed = await parseResponse<FortsResponse>(response);
		} else {
			console.error(`Error while fetching forts: ${response.status}`);
		}
	} catch (e) {
		if (!(e instanceof DOMException && e.name === "AbortError")) {
			console.error("Error while fetching forts", e);
		}
	}
	if (!parsed) return results;

	for (const plan of plans) {
		const typeResponse = parsed[plan.type as FortType];
		const hash = hashes.get(plan.type);
		if (typeResponse?.status === 200) {
			noteFilterCached(hash, typeResponse.filterCached);
			results.set(plan.type, typeResponse.result);
		} else if (typeResponse?.status === STATUS_FILTER_UNKNOWN) {
			// the server lost this filter; the single-type path re-sends it
			if (hash !== undefined) knownFilterHashes.delete(hash);
			results.set(
				plan.type,
				await fetchMapObjects(plan.type, bounds, plan.filter, signal, plan.since)
			);
		} else {
			console.error(`Error while fetching ${plan.type}: ${typeResponse?.status ?? "missing"}`);
			results.set(plan.type, undefined);
		}
	}
	return results;
}

export function planMapObjectRequest(
	type: MapObjectType,
	removeOld: boolean = true,
	filterOverwrite: AnyFilter | undefined = undefined,
	onlyChanged: boolean = false,
	signal?: AbortSignal
): MapObjectPlan | undefined {
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
	// A failed full refresh must be retried as a full snapshot, not an old viewport's delta.
	if (!onlyChanged) lastQueryTimestamps.delete(type);

	return { type, filter, since, isDelta, queryTimestamp: currentTimestamp(), limitInfo, removeOld };
}

export function applyMapObjectResponse(
	plan: MapObjectPlan,
	response: MapObjectResponse<QueryableMapData> | undefined,
	signal?: AbortSignal
): MapObjectType | undefined {
	const { type, filter, isDelta, limitInfo, removeOld } = plan;
	if (signal?.aborted) return;

	let examined = 0;
	let data: QueryableMapData[] | undefined = undefined;
	let clearLimitAfterRender = false;
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
		if (!response?.limitReached) {
			// Commit only applied responses, replaying the boundary second for timestamp granularity.
			lastQueryTimestamps.set(type, Math.max(0, plan.queryTimestamp - 1));
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

async function runPlan(plan: MapObjectPlan, signal?: AbortSignal) {
	if (plan.type === MapObjectType.S2_CELL) {
		const data = getS2CellMapObjects(getBounds(), plan.filter as FilterS2Cell);
		return applyMapObjectResponse(plan, { data, examined: data.length }, signal);
	}
	const response = await fetchMapObjects(plan.type, getBounds(), plan.filter, signal, plan.since);
	return applyMapObjectResponse(plan, response, signal);
}

export async function updateMapObject(
	type: MapObjectType,
	removeOld: boolean = true,
	filterOverwrite: AnyFilter | undefined = undefined,
	signal?: AbortSignal,
	onlyChanged: boolean = false
) {
	const plan = planMapObjectRequest(type, removeOld, filterOverwrite, onlyChanged, signal);
	if (!plan) return;
	return runPlan(plan, signal);
}

export async function updateAllMapObjects(removeOld: boolean = true, onlyChanged: boolean = false) {
	const map = getMap();
	if (!map) return;
	if (onlyChanged && currentController) return;

	currentController?.abort();
	const controller = new AbortController();
	currentController = controller;

	try {
		const activeSearch = getActiveSearch();
		const requestedTypes = activeSearch ? [activeSearch.mapObject] : [...allMapObjectTypes];
		if (activeSearch) {
			if ([MapObjectType.POKESTOP, MapObjectType.GYM].includes(activeSearch.mapObject)) {
				requestedTypes.push(MapObjectType.ROUTE);
			}
			for (const type of allMapObjectTypes) {
				if (!requestedTypes.includes(type)) clearMapObjects(type);
			}
		}
		const plans = requestedTypes
			.map((type) =>
				planMapObjectRequest(
					type,
					removeOld,
					activeSearch?.mapObject === type ? activeSearch.filter : undefined,
					onlyChanged,
					controller.signal
				)
			)
			.filter((plan) => plan !== undefined);
		const readyTypes = new Set<MapObjectType>();
		const limitsToClear: MapObjectType[] = [];
		let publication: Promise<void> | undefined;
		const publish = (final = false) => {
			publication ??= tick().then(() => {
				publication = undefined;
				if (controller.signal.aborted || getMap() !== map) return;
				// Only regenerate completed families early; popup companions can have their own requests.
				updateFeatures(getMapObjects(), final ? allMapObjectTypes : [...readyTypes]);
				for (const type of limitsToClear.splice(0)) clearDataLimit(type);
			});
			return publication;
		};
		const complete = (type: MapObjectType, recoveredLimit: MapObjectType | undefined) => {
			readyTypes.add(type);
			if (recoveredLimit !== undefined) limitsToClear.push(recoveredLimit);
			return publish();
		};
		const fortPlans = activeSearch
			? []
			: plans.filter((plan) => combinedGolbatFortTypes.some((type) => type === plan.type));
		const requests = plans
			.filter((plan) => fortPlans.length < 2 || !fortPlans.includes(plan))
			.map(async (plan) => {
				const recoveredLimit = await runPlan(plan, controller.signal);
				await complete(plan.type, recoveredLimit);
			});
		if (fortPlans.length >= 2) {
			requests.push(
				(async () => {
					const responses = await fetchForts(fortPlans, getBounds(), controller.signal);
					await Promise.all(
						fortPlans.map((plan) =>
							complete(
								plan.type,
								applyMapObjectResponse(plan, responses.get(plan.type), controller.signal)
							)
						)
					);
				})()
			);
		}
		if (!activeSearch) {
			requests.push(
				updateWeather().catch((error) => console.error("Error while updating weather", error))
			);
		}
		// Clear disabled families promptly, even when every request is skipped.
		requests.push(publish());
		await Promise.all(requests);
		// Reconcile removals/expiry and unrequested preserved objects after all work settles.
		await publish(true);
	} catch (error) {
		controller.abort();
		throw error;
	} finally {
		if (currentController === controller) currentController = undefined;
	}
}
