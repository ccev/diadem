import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { routeStartsAt } from "@/lib/utils/routeUtils";

export type MapObjectsStateType = {
	[key: string]: MapData;
};

let mapObjectsState: MapObjectsStateType = $state({});
let mapObjectCounts = $state(getInitialMapObjectCount());
const popupPreservedRouteMapIds = new Set<string>();

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

export function replaceMapObjects(mapObjects: MapData[], type: MapObjectType, examined: number) {
	const selected = getCurrentSelectedData();
	const selectedMapId = selected?.mapId;
	const prefix = type + "-";
	const nextMapObjects = { ...mapObjectsState };
	const incomingMapIds = new Set(mapObjects.map((mapObject) => mapObject.mapId));

	for (const mapId in nextMapObjects) {
		const preserveForFortPopup =
			type === MapObjectType.ROUTE &&
			!incomingMapIds.has(mapId) &&
			(selected?.type === MapObjectType.POKESTOP || selected?.type === MapObjectType.GYM) &&
			nextMapObjects[mapId]?.type === MapObjectType.ROUTE &&
			routeStartsAt(nextMapObjects[mapId] as RouteData, selected.id);
		if (preserveForFortPopup) popupPreservedRouteMapIds.add(mapId);
		if (mapId !== selectedMapId && !preserveForFortPopup && mapId.startsWith(prefix)) {
			popupPreservedRouteMapIds.delete(mapId);
			delete nextMapObjects[mapId];
		}
	}
	for (const mapObject of mapObjects) {
		popupPreservedRouteMapIds.delete(mapObject.mapId);
		nextMapObjects[mapObject.mapId] = mapObject;
	}

	mapObjectsState = nextMapObjects;
	mapObjectCounts[type] = { showing: mapObjects.length, examined };
}

export function delMapObject(key: string) {
	popupPreservedRouteMapIds.delete(key);
	delete mapObjectsState[key];
}

export function clearPopupPreservedRoutes() {
	for (const mapId of popupPreservedRouteMapIds) delete mapObjectsState[mapId];
	popupPreservedRouteMapIds.clear();
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
	popupPreservedRouteMapIds.clear();
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
