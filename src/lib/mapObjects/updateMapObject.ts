import { addMapObject, delMapObject, getMapObjects } from '@/lib/mapObjects/mapObjects.svelte.js';
import type maplibre from 'maplibre-gl';
import { getNormalizedBounds } from '@/lib/mapObjects/utils';
import type { MapData, MapObjectType } from '@/lib/types/mapObjectData/mapObjects';

export function makeMapObject(data: MapData, type: MapObjectType) {
	data.type = type;
	data.mapId = type + '-' + data.id;
	addMapObject(data.mapId, data);
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
	const body = getNormalizedBounds(map);
	const response = await fetch('/api/' + type, { method: 'POST', body: JSON.stringify(body) });
	const data = await response.json();

	if (!data) return;
	if (data.error) {
		console.error('Error while fetching ' + type + ': ' + data.error);
		return;
	}

	if (removeOld) {
		for (const key in getMapObjects()) {
			if (key.startsWith(type + '-')) {
				delMapObject(key);
			}
		}
	}

	if (!data.result) {
		return;
	}

	try {
		for (const mapObject of data.result) {
			makeMapObject(mapObject, type);
		}
	} catch (e) {
		console.log(data);
		console.error(e);
	}
}