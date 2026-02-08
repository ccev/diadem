import { getConfig } from '@/lib/services/config/config';
import type { MapMouseEvent } from 'maplibre-gl';
import type { LayerClickInfo } from 'svelte-maplibre';
import type { MapObjectFeature, MapObjectIconFeature } from "@/lib/map/featuresGen.svelte.js";
import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte.js';
import { getCurrentSelectedData, setCurrentSelectedData } from '@/lib/mapObjects/currentSelectedState.svelte';

import { setIsContextMenuOpen } from '@/lib/ui/contextmenu.svelte.js';
import { updateAllMapObjects } from '@/lib/mapObjects/updateMapObject';
import { getMapPath } from "@/lib/utils/getMapPath";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import { getMap } from "@/lib/map/map.svelte";
import { MapObjectLayerId } from "@/lib/map/layers";
import { closeMenu, openMenu } from "@/lib/ui/menus.svelte";
import { getIsCoverageMapActive } from "@/lib/features/coverageMap.svelte";

export function closePopup() {
	setCurrentSelectedData(null);
	setCurrentPath();

	// call this to remove selected data (if needed)
	updateAllMapObjects().then()

	const title = document.head.querySelector('title');
	if (title) title.innerText = getConfig().general.mapName;
}

export function openPopup(data: MapData, isOverwrite: boolean = false) {
	setCurrentSelectedData(data, isOverwrite);
	setCurrentPath();
}

export function updateCurrentPath() {
	const data = getCurrentSelectedData()
	if (!data) return;
	if (window.location.pathname.includes(data.type)) return;
	setCurrentPath();
}

export function getCurrentPath() {
	const data = getCurrentSelectedData()
	if (data) {
		return `/${data.type}/${data.id}`
	}
	return getMapPath(getConfig())
}

function setCurrentPath() {
	history.replaceState(null, '', getCurrentPath());
}

export function clickMapHandler(event: MapMouseEvent) {
	if (event.originalEvent.defaultPrevented) return;

	const map = getMap()
	if (!map) return

	const features = map.queryRenderedFeatures(event.point, {
		layers: Object.values(MapObjectLayerId)
	})

	// @ts-ignore
	const feature = features[0] as MapObjectFeature

	if (feature) {
		openPopup(getMapObjects()[feature.properties.id])
	} else {
		if (!getIsCoverageMapActive()) {
			closeMenu()
		}

		closePopup()
	}
}