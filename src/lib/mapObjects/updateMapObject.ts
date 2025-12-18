import {
	addMapObjects,
	clearAllMapObjects,
	clearMapObjects,
	getMapObjects
} from "@/lib/mapObjects/mapObjectsState.svelte.js";
import { type Bounds, getBounds } from "@/lib/mapObjects/mapBounds";
import type { MapData, MapObjectType, MinorMapObjectType } from '@/lib/types/mapObjectData/mapObjects';
import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
import type { AnyFilter, FilterS2Cell } from "@/lib/features/filters/filters";
import { updateFeatures } from "@/lib/map/featuresGen.svelte";
import { clearS2Cells, updateS2CellGeojson } from "@/lib/mapObjects/s2cells.svelte.js";
import { updateWeather } from "@/lib/mapObjects/weather.svelte";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
import { allMapObjectTypes, allMinorMapTypes } from "@/lib/mapObjects/mapObjectTypes";
import type { MapObjectResponse } from '@/lib/server/api/queryMapObjects';

export type MapObjectRequestData = Bounds & { filter: AnyFilter };

export function getMapObjectId(type: MapObjectType, id: string) {
	return type + "-" + id;
}

export function clearMap() {
	// TODO: Also do this on login
	clearAllMapObjects();
	clearS2Cells();
	updateFeatures(getMapObjects());
}

export async function updateMapObject(
	type: MapObjectType | MinorMapObjectType,
	removeOld: boolean = true
) {
	if (!hasFeatureAnywhere(getUserDetails().permissions, type)) return;

	const startTime = performance.now();
	let filter: AnyFilter | undefined = undefined;

	if (type === "pokemon") {
		filter = getUserSettings().filters.pokemon;
	} else if (type === "pokestop") {
		filter = getUserSettings().filters.pokestop;
	} else if (type === "gym") {
		filter = getUserSettings().filters.gym;
	} else if (type === "station") {
		filter = getUserSettings().filters.station;
	} else if (type === "s2cell") {
		filter = getUserSettings().filters.s2cell;
	}

	if ((!filter || !filter.enabled) && type !== "s2cell") {
		clearMapObjects(type);
		updateFeatures(getMapObjects());
		return;
	}

	const body: MapObjectRequestData = {
		...getBounds(),
		filter
	};

	if (type === "s2cell") {
		updateS2CellGeojson(body as { filter: FilterS2Cell } & Bounds);
		return;
	}

	const fetchStart = performance.now();
	const response = await fetch("/api/" + type, { method: "POST", body: JSON.stringify(body) });

	if (!response.ok) {
		console.error(`Error while fetching ${type}: ${response.status}`)
		return
	}

	const data: MapObjectResponse<MapData> = await response.json();
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
		...allMinorMapTypes.map((type) => {
			updateMapObject(type, removeOld);
		}),
		updateWeather()
	]);
}
