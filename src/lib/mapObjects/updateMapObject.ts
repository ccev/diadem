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
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
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

export function clearMap() {
	// TODO: Also do this on login
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

export async function fetchMapObjects<T extends MapData>(
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
): Promise<Map<MapObjectType, MapObjectResponse<MapData> | undefined>> {
	const results = new Map<MapObjectType, MapObjectResponse<MapData> | undefined>();
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
	lastQueryTimestamps.set(type, currentTimestamp());

	return { type, filter, since, isDelta, limitInfo, removeOld };
}

export function applyMapObjectResponse(
	plan: MapObjectPlan,
	response: MapObjectResponse<MapData> | undefined,
	signal?: AbortSignal
): MapObjectType | undefined {
	const { type, filter, isDelta, limitInfo, removeOld } = plan;
	if (signal?.aborted) return;

	let examined = 0;
	let data: MapData[] | undefined = undefined;
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
		const otherTypes = allMapObjectTypes.filter(
			(type) => !combinedGolbatFortTypes.some((fortType) => fortType === type)
		);
		const fortPlans = combinedGolbatFortTypes
			.map((type) =>
				planMapObjectRequest(type, removeOld, undefined, onlyChanged, controller.signal)
			)
			.filter((plan) => plan !== undefined);

		const updateForts = async () => {
			if (fortPlans.length < 2) {
				return Promise.all(fortPlans.map((plan) => runPlan(plan, controller.signal)));
			}
			const responses = await fetchForts(fortPlans, getBounds(), controller.signal);
			return fortPlans.map((plan) =>
				applyMapObjectResponse(plan, responses.get(plan.type), controller.signal)
			);
		};

		const [otherResults, fortResults] = await Promise.all([
			Promise.all(
				otherTypes.map((type) =>
					updateMapObject(type, removeOld, undefined, controller.signal, onlyChanged)
				)
			),
			updateForts(),
			updateWeather()
		]);
		limitsToClear = [...otherResults, ...fortResults].filter((type) => type !== undefined);
	}

	if (controller.signal.aborted) return;
	currentController = undefined;
	updateFeatures(getMapObjects());
	for (const type of limitsToClear) clearDataLimit(type);
}
