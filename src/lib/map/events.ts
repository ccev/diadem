import { updateFeatures } from "@/lib/map/featuresGen.svelte";
import { setIsLocateFollowing } from "@/lib/map/geolocate.svelte";
import { clearLoadMapObjectsInterval, resetLoadMapObjects } from "@/lib/map/loadMapObjects";
import { addMapStyleVersion, getMap } from "@/lib/map/map.svelte";
import {
	clearUpdateMapObjectsInterval,
	resetUpdateMapObjectsInterval
} from "@/lib/map/mapObjectsInterval";
import { setSkew } from "@/lib/map/mapSkew.svelte";
import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
import { resetSearchedLocation } from "@/lib/services/search.svelte";
import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte.js";
import {
	clearPressTimer,
	longPressDuration,
	onContextMenu,
	pressTimer
} from "@/lib/ui/contextmenu.svelte.js";
import maplibre from "maplibre-gl";
import type { MapMoveEvent } from "svelte-maplibre";

export async function onMapMoveEnd() {
	clearLoadMapObjectsInterval();
	updateAllMapObjects().then();

	const map = getMap();
	if (map) {
		resetUpdateMapObjectsInterval();

		getUserSettings().mapPosition.zoom = map.getZoom();
		getUserSettings().mapPosition.center = map.getCenter();
		updateUserSettings();
	}
}

export function onTouchStart(e: maplibre.MapTouchEvent) {
	pressTimer.push(setTimeout(() => onContextMenu(e), longPressDuration));
}

export async function onMapMoveStart() {
	clearPressTimer();
	clearUpdateMapObjectsInterval();
	resetLoadMapObjects();

	resetSearchedLocation();
}

export function onMapDragStart() {
	setIsLocateFollowing(false);
}

export function onWindowFocus() {
	if (!getMap()) return;
	updateAllMapObjects(true, true).then();
	resetUpdateMapObjectsInterval();
}

export function onMapMove(event: MapMoveEvent) {
	setSkew(event.target.getPitch(), event.target.getBearing());
}

export function onMapStyleDataLoading() {
	updateFeatures(getMapObjects());
	getMap()?.once("styledata", onMapStyleLoad);
}

export function onMapStyleLoad() {
	addMapStyleVersion();
}
