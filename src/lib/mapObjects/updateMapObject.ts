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
import type { MapObjectResponse } from "@/lib/server/api/queryMapObjects";
import { getActiveSearch } from "@/lib/features/activeSearch.svelte.js";

export type MapObjectRequestData = Bounds & { filter: AnyFilter | undefined };

export function clearMap() {
	// TODO: Also do this on login
	clearAllMapObjects();
	updateFeatures(getMapObjects());
}

export async function fetchMapObjects<T extends MapData>(
	type: MapObjectType,
	bounds: Bounds,
	filter: AnyFilter | undefined = undefined
): Promise<MapObjectResponse<T> | undefined> {
	const body: MapObjectRequestData = {
		...getBounds(),
		filter
	};
	const response = await fetch("/api/" + type, { method: "POST", body: JSON.stringify(body) });

	if (!response.ok) {
		console.error(`Error while fetching ${type}: ${response.status}`);
		return;
	}

	return await response.json();
}

export async function updateMapObject(
	type: MapObjectType,
	removeOld: boolean = true,
	filterOverwrite: AnyFilter | undefined = undefined
) {
	if (!hasFeatureAnywhere(getUserDetails().permissions, type)) return;

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
		} else if (type === MapObjectType.S2_CELL) {
			filter = getUserSettings().filters.s2cell;
		} else if (type === MapObjectType.NEST) {
			filter = getUserSettings().filters.nest;
		} else if (type === MapObjectType.SPAWNPOINT) {
			filter = getUserSettings().filters.spawnpoint;
		} else if (type === MapObjectType.ROUTE) {
			filter = getUserSettings().filters.route;
		} else if (type === MapObjectType.TAPPABLE) {
			filter = getUserSettings().filters.tappable;
		} else {
			console.log("unknown type while udpating map objects!");
			return;
		}
	}

	if (!filter || !filter.enabled) {
		clearMapObjects(type);
		updateFeatures(getMapObjects());
		return;
	}

	let examined: number = 0;
	let data: MapData[] | undefined = undefined;
	if (type === MapObjectType.S2_CELL) {
		data = getS2CellMapObjects(getBounds(), filter as FilterS2Cell);
		examined = data.length;
	} else {
		const response = await fetchMapObjects(type, getBounds(), filter);
		if (response) {
			data = response.data;
			examined = response.examined;
		}
	}

	// TODO: we shouldn't clear stuff that's still kept after. svelte will
	// run effects in-between clearing and adding
	if (removeOld) {
		clearMapObjects(type);
	}

	if (!data || data.length === 0) return;

	try {
		addMapObjects(data, type, examined);
	} catch (e) {
		console.log(data);
		console.error(e);
	}

	updateFeatures(getMapObjects());
}

export async function updateAllMapObjects(removeOld: boolean = true) {
	const activeSearch = getActiveSearch();

	if (activeSearch) {
		await updateMapObject(activeSearch.mapObject, removeOld, activeSearch.filter);
	} else {
		await Promise.all([
			...allMapObjectTypes.map((type) => {
				updateMapObject(type, removeOld);
			}),
			updateWeather()
		]);
	}
}
