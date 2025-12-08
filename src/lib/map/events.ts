import maplibre from 'maplibre-gl';
import {
	clearPressTimer,
	longPressDuration,
	onContextMenu,
	pressTimer, setIsContextMenuOpen
} from '@/lib/ui/contextmenu.svelte.js';
import { clearLoadMapObjectsInterval, resetLoadMapObjects } from '@/lib/map/loadMapObjects';
import { updateAllMapObjects } from '@/lib/mapObjects/updateMapObject';
import {
	clearUpdateMapObjectsInterval,
	resetUpdateMapObjectsInterval
} from '@/lib/map/mapObjectsInterval';
import { getUserSettings, updateUserSettings } from '@/lib/services/userSettings.svelte.js';
import { getMap } from '@/lib/map/map.svelte';
import { setAnimateLocationMarker } from '@/lib/map/geolocate.svelte';
import type { MapMoveEvent } from 'svelte-maplibre';
import { setSkew } from '@/lib/map/mapSkew.svelte';
import { clearSessionImageUrls } from "@/lib/map/featuresManage.svelte";
import { updateFeatures } from "@/lib/map/featuresGen.svelte";
import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";

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
	setAnimateLocationMarker(false)

	resetLoadMapObjects();
}

export function onWindowFocus() {
	if (!getMap()) return;
	updateAllMapObjects().then();
	resetUpdateMapObjectsInterval();
}

export function onMapMove(event: MapMoveEvent) {
	setSkew(event.target.getPitch(), event.target.getBearing())
}

export function onMapStyleDataLoading() {
	// this is fired when the map style is changed
	// so we need to re-fetch images as these are tied to the style
	clearSessionImageUrls()
	updateFeatures(getMapObjects())
}