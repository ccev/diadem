import {
	addMapObject,
	clearMapObjects,
	delMapObject,
	getMapObjects, getMapObjectsSnapshot,
	setMapObjectState
} from '@/lib/mapObjects/mapObjects.svelte.js';
import type maplibre from 'maplibre-gl';
import { getNormalizedBounds } from '@/lib/mapObjects/utils';
import type { MapData, MapObjectType } from '@/lib/types/mapObjectData/mapObjects';
import { getUserSettings } from '@/lib/userSettings.svelte';

export function makeMapObject(data: MapData, type: MapObjectType) {
	data.type = type;
	data.mapId = type + '-' + data.id;
	addMapObject(data);
}

export async function getOneMapObject(
	type: MapObjectType,
	id: string
): Promise<Partial<MapData>> {
	const response = await fetch('/api/' + type + "/" + id);
	const data = await response.json();

	if (!data) return;
	if (data.error) {
		console.error('Error while fetching ' + type + ': ' + data.error);
		return;
	}

	if (!data.result) {
		return;
	}
	return data.result[0]
}

export async function updateMapObject(
	map: maplibre.Map,
	type: MapObjectType,
	removeOld: boolean = true
) {
	let filter = {}

	if (type === "pokemon") {
		filter = getUserSettings().filters.pokemonMajor
	} else if (type === "pokestop") {
		filter = getUserSettings().filters.pokestopPlain
	} else if (type === "gym") {
		filter = getUserSettings().filters.gymPlain
	} else if (type === "station") {
		filter = getUserSettings().filters.stationMajor
	}

	if (filter.type === "none") {
		clearMapObjects(type)
		return
	}

	const body = {
		...getNormalizedBounds(map),
		filter
	}
	const response = await fetch('/api/' + type, { method: 'POST', body: JSON.stringify(body) });
	const data = await response.json();

	if (!data) return;
	if (data.error) {
		console.error('Error while fetching ' + type + ': ' + data.error);
		return;
	}

	const mapObjects = getMapObjectsSnapshot()

	// TODO: we shouldn't clear stuff that's still kept after. svelte will
	// run effects in-between clearing and adding
	if (removeOld) {
		for (const key of Object.keys(mapObjects)) {
			if (key.startsWith(type + '-')) {
				delete mapObjects[key];
			}
		}
		// clearMapObjects(type)
	}

	if (!data.result) {
		return;
	}

	try {
		for (const mapObject of data.result) {
			mapObject.type = type;
			mapObject.mapId = type + '-' + mapObject.id;
			mapObjects[mapObject.mapId] = mapObject
			// makeMapObject(mapObject, type);
		}
		setMapObjectState(mapObjects)

	} catch (e) {
		console.log(data);
		console.error(e);
	}
}