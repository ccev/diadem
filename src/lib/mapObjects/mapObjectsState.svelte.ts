import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export type MapObjectsStateType = {
	[key: string]: MapData;
};

let mapObjectsState: MapObjectsStateType = $state({});
let mapObjectCounts = $state(getInitialMapObjectCount());

export function getMapObjects() {
	return mapObjectsState;
}

export function addMapObjects(
	mapObjects: MapData[],
	type: MapObjectType,
	examined: number,
	isDelta: boolean = false
) {
	mapObjectsState = {
		...mapObjectsState,
		...Object.fromEntries(mapObjects.map((o) => [o.mapId, o]))
	};
	if (isDelta) {
		const prefix = type + "-";
		let showing = 0;
		for (const key in mapObjectsState) {
			if (key.startsWith(prefix)) showing++;
		}
		// we're not updating examined on deltas.
		// the examined counts are therefore inaccurate.
		// but that's fine. deltas happen when the map doesn't move, so the count should be
		// close enough.
		mapObjectCounts[type].showing = showing;
	} else {
		mapObjectCounts[type] = { showing: mapObjects.length, examined };
	}
}

export function delMapObject(key: string) {
	delete mapObjectsState[key];
}

export function clearMapObjects(type: MapObjectType) {
	mapObjectCounts[type] = { showing: 0, examined: 0 };

	for (const key in getMapObjects()) {
		// skip selected data
		if (getCurrentSelectedData()?.mapId === key) continue;

		if (key.startsWith(type + "-")) {
			delMapObject(key);
		}
	}
}

export function clearAllMapObjects() {
	mapObjectsState = {};
	mapObjectCounts = getInitialMapObjectCount();
}

export function getMapObjectCounts(type: MapObjectType) {
	return mapObjectCounts[type];
}

function getInitialMapObjectCount(): {
	[key in MapObjectType]: { showing: number; examined: number };
} {
	return Object.fromEntries(
		allMapObjectTypes.map((type) => [type, { showing: 0, examined: 0 }])
	) as Record<MapObjectType, { showing: number; examined: number }>;
}
