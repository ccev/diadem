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
import { clearS2Cells, updateS2CellGeojson } from "@/lib/mapObjects/s2cells.svelte.js";
import { updateWeather } from "@/lib/mapObjects/weather.svelte";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { MapObjectResponse } from "@/lib/server/api/queryMapObjects";

export type MapObjectRequestData = Bounds & { filter: AnyFilter | undefined };

export function clearMap() {
	// TODO: Also do this on login
	clearAllMapObjects();
	clearS2Cells();
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

export async function updateMapObject(type: MapObjectType, removeOld: boolean = true) {
	if (!hasFeatureAnywhere(getUserDetails().permissions, type)) return;

	const startTime = performance.now();
	let filter: AnyFilter | undefined = undefined;

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

	if ((!filter || !filter.enabled) && type !== MapObjectType.S2_CELL) {
		clearMapObjects(type);
		updateFeatures(getMapObjects());
		return;
	}

	if (type === MapObjectType.S2_CELL) {
		const body: MapObjectRequestData = {
			...getBounds(),
			filter
		};
		updateS2CellGeojson(body as { filter: FilterS2Cell } & Bounds);
		return;
	}

	const fetchStart = performance.now();
	const data = await fetchMapObjects(type, getBounds(), filter);

	if (!data) return;

	console.debug("updateMapObject | fetch took " + (performance.now() - fetchStart) + "ms");

	// const startTime = performance.now()
	// const mapObjects = getMapObjectsSnapshot()
	// console.debug("getMapObjectsSnapshot took " + (performance.now() - startTime) + "ms")

	// TODO: we shouldn't clear stuff that's still kept after. svelte will
	// run effects in-between clearing and adding
	if (removeOld) {
		const removeStart = performance.now();
		// for (const key of Object.keys(mapObjects)) {
		// 	if (key.startsWith(type + '-')) {
		// 		delete mapObjects[key];
		// 	}
		// }
		clearMapObjects(type);
		console.debug(
			"updateMapObject | clearMapObject took " + (performance.now() - removeStart) + "ms"
		);
	}

	if (!data.data) {
		return;
	}

	try {
		const makeStart = performance.now();
		// for (const mapObject of data.result) {
		// 	// mapObject.type = type;
		// 	// mapObject.mapId = type + '-' + mapObject.id;
		// 	// mapObjects[mapObject.mapId] = mapObject
		// 	makeMapObject(mapObject, type);
		// }
		addMapObjects(data.data, type, data.examined);
		// setMapObjectState(mapObjects)
		console.debug("updateMapObject | addMapObjects took " + (performance.now() - makeStart) + "ms");
	} catch (e) {
		console.log(data);
		console.error(e);
	}

	console.debug(
		"updateMapObject | type " + type + " took " + (performance.now() - startTime) + "ms"
	);
	updateFeatures(getMapObjects());
}

export async function updateAllMapObjects(removeOld: boolean = true) {
	await Promise.all([
		...allMapObjectTypes.map((type) => {
			updateMapObject(type, removeOld);
		}),
		updateWeather()
	]);
}
