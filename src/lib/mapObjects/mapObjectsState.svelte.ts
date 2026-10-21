import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
import {
	allMapObjectTypes,
	type QueryableMapData,
	MapObjectType
} from "@/lib/mapObjects/mapObjectTypes";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { routeStartsAt } from "@/lib/utils/routeUtils";

export type MapObjectsStateType = {
	[key: string]: QueryableMapData;
};

let mapObjectsState: MapObjectsStateType = $state({});
let revision = 0;
// Compare decoded payloads without walking Svelte's reactive proxies on every poll.
const payloads = new Map<string, QueryableMapData>();
let mapObjectCounts = $state(getInitialMapObjectCount());
const popupPreservedRouteMapIds = new Set<string>();

/** Compare decoded payloads: timestamps alone cannot identify nested or permission-filtered changes. */
function sameMapObject(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
	if (Array.isArray(a)) {
		return (
			Array.isArray(b) && a.length === b.length && a.every((value, i) => sameMapObject(value, b[i]))
		);
	}
	if (Array.isArray(b)) return false;
	const left = a as Record<string, unknown>;
	const right = b as Record<string, unknown>;
	const keys = Object.keys(left);
	return (
		keys.length === Object.keys(right).length &&
		keys.every((key) => Object.hasOwn(right, key) && sameMapObject(left[key], right[key]))
	);
}

function reuseUnchangedMapObject(object: QueryableMapData) {
	const existing = mapObjectsState[object.mapId];
	if (existing && sameMapObject(payloads.get(object.mapId), object)) return existing;
	payloads.set(object.mapId, object);
	return object;
}

export function getMapObjectsRevision() {
	return revision;
}

export function getMapObjects() {
	return mapObjectsState;
}

export function addMapObjects(
	mapObjects: QueryableMapData[],
	type: MapObjectType,
	examined: number,
	isDelta: boolean = false
) {
	if (isDelta && mapObjects.length === 0) return;
	const changed = mapObjects
		.map(reuseUnchangedMapObject)
		.filter((o) => mapObjectsState[o.mapId] !== o);
	if (changed.length) {
		mapObjectsState = {
			...mapObjectsState,
			...Object.fromEntries(changed.map((o) => [o.mapId, o]))
		};
		revision++;
	}
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

export function replaceMapObjects(
	mapObjects: QueryableMapData[],
	type: MapObjectType,
	examined: number
) {
	const selected = getCurrentSelectedData();
	const selectedMapId = selected?.mapId;
	const prefix = type + "-";
	let nextMapObjects: MapObjectsStateType | undefined;
	const incomingMapIds = new Set(mapObjects.map((mapObject) => mapObject.mapId));

	for (const mapId in mapObjectsState) {
		if (!mapId.startsWith(prefix) || incomingMapIds.has(mapId)) continue;
		const preserveForFortPopup =
			type === MapObjectType.ROUTE &&
			(selected?.type === MapObjectType.POKESTOP || selected?.type === MapObjectType.GYM) &&
			mapObjectsState[mapId]?.type === MapObjectType.ROUTE &&
			routeStartsAt(mapObjectsState[mapId] as RouteData, selected.id);
		if (preserveForFortPopup) popupPreservedRouteMapIds.add(mapId);
		if (mapId !== selectedMapId && !preserveForFortPopup) {
			popupPreservedRouteMapIds.delete(mapId);
			payloads.delete(mapId);
			nextMapObjects ??= { ...mapObjectsState };
			delete nextMapObjects[mapId];
		}
	}
	for (const mapObject of mapObjects) {
		popupPreservedRouteMapIds.delete(mapObject.mapId);
		const object = reuseUnchangedMapObject(mapObject);
		if (mapObjectsState[object.mapId] !== object) {
			nextMapObjects ??= { ...mapObjectsState };
			nextMapObjects[object.mapId] = object;
		}
	}

	if (nextMapObjects) {
		mapObjectsState = nextMapObjects;
		revision++;
	}
	mapObjectCounts[type] = { showing: mapObjects.length, examined };
}

export function delMapObject(key: string) {
	payloads.delete(key);
	if (key in mapObjectsState) revision++;
	popupPreservedRouteMapIds.delete(key);
	delete mapObjectsState[key];
}

export function clearPopupPreservedRoutes() {
	for (const mapId of popupPreservedRouteMapIds) delMapObject(mapId);
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
	payloads.clear();
	revision++;
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
