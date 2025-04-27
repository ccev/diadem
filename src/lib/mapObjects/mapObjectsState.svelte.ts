import type { MapData, MapObjectType } from '@/lib/types/mapObjectData/mapObjects';

export type MapObjectsStateType = {
	[key: string]: MapData;
};

let mapObjectsState: MapObjectsStateType = $state({});
export const allMapTypes: MapObjectType[] = ['pokemon', 'pokestop', 'gym', 'station'];

export function getMapObjects() {
	return mapObjectsState;
}

export function addMapObject(data: MapData) {
	mapObjectsState[data.mapId] = data;
}

export function addMapObjects(mapObjects: MapData[], type: MapObjectType) {
	const newState: MapObjectsStateType = {};
	for (const data of mapObjects) {
		data.type = type;
		data.mapId = type + '-' + data.id;
		newState[data.mapId] = data;
	}
	mapObjectsState = { ...mapObjectsState, ...newState };
}

export function delMapObject(key: string) {
	delete mapObjectsState[key];
}

export function clearMapObjects(type: MapObjectType) {
	for (const key in getMapObjects()) {
		if (key.startsWith(type + '-')) {
			delMapObject(key);
		}
	}
}