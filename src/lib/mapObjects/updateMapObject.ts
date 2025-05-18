import {
	addMapObject,
	addMapObjects,
	allMapTypes,
	allMinorMapTypes,
	clearMapObjects,
	getMapObjects
} from '@/lib/mapObjects/mapObjectsState.svelte.js';
import maplibre from 'maplibre-gl';
import { type Bounds, getBounds } from '@/lib/mapObjects/mapBounds';
import type {
	MapData,
	MapObjectType,
	MinorMapObjectType
} from '@/lib/types/mapObjectData/mapObjects';
import { getUserSettings } from '@/lib/userSettings.svelte';
import type { AllFilters, FilterS2Cell } from '@/lib/filters/filters';
import { getDirectLinkObject, setDirectLinkObject } from '@/lib/directLinks.svelte';
import { openPopup } from '@/lib/mapObjects/interact';
import { openToast } from '@/components/ui/toast/toastUtils.svelte';
import * as m from '@/lib/paraglide/messages';
import { getMap } from '@/lib/map/map.svelte';
import { updateFeatures } from '@/lib/map/featuresGen.svelte';
import { updateMapObjectsGeoJson } from '@/lib/map/featuresManage.svelte';
import { updateS2CellGeojson } from '@/lib/mapObjects/s2cells.svelte.js';
import { updateWeather } from '@/lib/mapObjects/weather.svelte';
import { checkPermsFeatures } from '@/lib/user/checkPerm';
import { getUserDetails } from '@/lib/user/userDetails.svelte';

export function makeMapObject(data: MapData, type: MapObjectType) {
	data.type = type;
	data.mapId = type + '-' + data.id;
	addMapObject(data);
}

export async function getOneMapObject(
	type: MapObjectType,
	id: string
): Promise<Partial<MapData> | undefined> {
	const response = await fetch('/api/' + type + '/' + id);
	const data = await response.json();

	if (!data) return;
	if (data.error) {
		console.error('Error while fetching ' + type + ': ' + data.error);
		return;
	}

	if (!data.result) {
		return;
	}
	return data.result[0];
}

export async function updateMapObject(
	type: MapObjectType | MinorMapObjectType,
	removeOld: boolean = true
) {
	if (!checkPermsFeatures(getUserDetails().permissions, type)) return

	const startTime = performance.now();
	let filter: AllFilters | undefined = undefined;

	if (type === 'pokemon') {
		filter = getUserSettings().filters.pokemonMajor;
	} else if (type === 'pokestop') {
		filter = getUserSettings().filters.pokestopPlain;
	} else if (type === 'gym') {
		filter = getUserSettings().filters.gymPlain;
	} else if (type === 'station') {
		filter = getUserSettings().filters.stationMajor;
	} else if (type === 's2cell') {
		filter = getUserSettings().filters.s2cell
	}

	if ((!filter || filter.type === 'none') && type !== "s2cell") {
		clearMapObjects(type);
		updateFeatures(getMapObjects());
		return;
	}

	const body = {
		...getBounds(),
		filter
	};

	if (type === 's2cell') {
		updateS2CellGeojson(body as { filter: FilterS2Cell } & Bounds);
		return;
	}

	const fetchStart = performance.now();
	const response = await fetch('/api/' + type, { method: 'POST', body: JSON.stringify(body) });
	const data = await response.json();
	console.debug('updateMapObject | fetch took ' + (performance.now() - fetchStart) + 'ms');

	if (!data) return;
	if (data.error) {
		console.error('Error while fetching ' + type + ': ' + data.error);
		return;
	}

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
			'updateMapObject | clearMapObject took ' + (performance.now() - removeStart) + 'ms'
		);
	}

	if (!data.result) {
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
		addMapObjects(data.result, type);
		// setMapObjectState(mapObjects)
		console.debug('updateMapObject | addMapObjects took ' + (performance.now() - makeStart) + 'ms');
	} catch (e) {
		console.log(data);
		console.error(e);
	}

	console.debug(
		'updateMapObject | type ' + type + ' took ' + (performance.now() - startTime) + 'ms'
	);
	updateFeatures(getMapObjects());
}

export async function updateAllMapObjects(removeOld: boolean = true) {
	await Promise.all([
		...allMapTypes.map((type) => {
			updateMapObject(type, removeOld);
		}),
		...allMinorMapTypes.map((type) => {
			updateMapObject(type, removeOld);
		}),
		updateWeather()
	]);

	const directLinkData = getDirectLinkObject();
	if (directLinkData) {
		const mapObjectData = getMapObjects()[directLinkData.id];
		if (mapObjectData) {
			openPopup(mapObjectData);
		} else {
			openToast(m.direct_link_not_found({ type: m['pogo_' + directLinkData.type]() }), 5000);
		}
		setDirectLinkObject(undefined);
	}
}
