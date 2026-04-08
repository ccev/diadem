import {
	addMapObjects,
	clearAllMapObjects,
	clearMapObjects,
	getMapObjects
} from "@/lib/mapObjects/mapObjectsState.svelte.js";
import { type Bounds, getBounds } from "@/lib/mapObjects/mapBounds";
import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
import type { AnyFilter, FilterS2Cell } from "@/lib/features/filters/filters";
import { updateFeatures } from "@/lib/map/featuresGen.svelte";
import { getS2CellMapObjects } from "@/lib/mapObjects/s2cells.js";
import { updateWeather } from "@/lib/mapObjects/weather.svelte";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import { getActiveSearch } from "@/lib/features/activeSearch.svelte.js";
import { getIsCoverageMapActive } from "@/lib/features/coverageMap.svelte";
import { decode } from "@msgpack/msgpack";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { getHeaders, parseResponse } from "@/lib/utils/requests";

export type MapObjectRequestData = Bounds & { filter: AnyFilter | undefined; since?: number };

let currentController: AbortController | undefined;
const lastQueryTimestamps = new Map<MapObjectType, number>();

export function resetLastQueryTimestamps() {
	lastQueryTimestamps.clear();
}

export function clearMap() {
	// TODO: Also do this on login
	clearAllMapObjects();
	resetLastQueryTimestamps();
	updateFeatures(getMapObjects());
}

export async function fetchMapObjects<T extends MapData>(
	type: MapObjectType,
	bounds: Bounds,
	filter: AnyFilter | undefined = undefined,
	signal?: AbortSignal,
	since?: number
): Promise<MapObjectResponse<T> | undefined> {
	const body: MapObjectRequestData = {
		...getBounds(),
		filter,
		since
	};
	try {
		const response = await fetch("/api/" + type, {
			method: "POST",
			body: JSON.stringify(body),
			headers: getHeaders({ msgpack: true }),
			signal
		});

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
	if (!hasFeatureAnywhere(getUserDetails().permissions, type)) return;
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
		if (!signal) updateFeatures(getMapObjects());
		return;
	}

	const since = onlyChanged ? lastQueryTimestamps.get(type) : undefined;
	const isDelta = onlyChanged && since !== undefined;
	lastQueryTimestamps.set(type, currentTimestamp());

	let examined: number = 0;
	let data: MapData[] | undefined = undefined;
	if (type === MapObjectType.S2_CELL) {
		data = getS2CellMapObjects(getBounds(), filter as FilterS2Cell);
		examined = data.length;
	} else {
		const response = await fetchMapObjects(type, getBounds(), filter, signal, since);
		if (signal?.aborted) return;
		if (response) {
			data = response.data;
			examined = response.examined;
		}
	}

	// TODO: we shouldn't clear stuff that's still kept after. svelte will
	// run effects in-between clearing and adding
	if (removeOld && !isDelta && data) {
		clearMapObjects(type);
	}

	if (!data) {
		if (!signal) updateFeatures(getMapObjects());
		return;
	}

	try {
		addMapObjects(data, type, examined, isDelta);
	} catch (e) {
		console.log(data);
		console.error(e);
	}

	if (!signal) updateFeatures(getMapObjects());
}

export async function updateAllMapObjects(removeOld: boolean = true, onlyChanged: boolean = false) {
	if (getIsCoverageMapActive()) return;

	if (onlyChanged && currentController) return;

	currentController?.abort();
	const controller = new AbortController();
	currentController = controller;

	const activeSearch = getActiveSearch();

	if (activeSearch) {
		for (const mapObjectType of allMapObjectTypes) {
			if (mapObjectType !== activeSearch.mapObject) clearMapObjects(mapObjectType);
		}
		await updateMapObject(
			activeSearch.mapObject,
			removeOld,
			activeSearch.filter,
			controller.signal,
			onlyChanged
		);
	} else {
		await Promise.all([
			...allMapObjectTypes.map((type) =>
				updateMapObject(type, removeOld, undefined, controller.signal, onlyChanged)
			),
			updateWeather()
		]);
	}

	if (controller.signal.aborted) return;
	currentController = undefined;
	updateFeatures(getMapObjects());
}
