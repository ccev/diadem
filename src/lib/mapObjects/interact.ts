import { getConfig } from '@/lib/services/config/config';
import type { MapMouseEvent } from 'maplibre-gl';
import type { LayerClickInfo } from 'svelte-maplibre';
import type { Feature } from '@/lib/map/featuresGen.svelte.js';
import type { MapData } from '@/lib/types/mapObjectData/mapObjects';
import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte.js';
import { getCurrentSelectedData, setCurrentSelectedData } from '@/lib/mapObjects/currentSelectedState.svelte';

import { setIsContextMenuOpen } from '@/lib/ui/contextmenu.svelte.js';
import { updateAllMapObjects } from '@/lib/mapObjects/updateMapObject';
import { getMapPath } from "@/lib/utils/getMapPath";

export function closePopup() {
	setCurrentSelectedData(null);
	setCurrentPath();

	// call this to remove selected data (if needed)
	updateAllMapObjects().then()

	const title = document.head.querySelector('title');
	if (title) title.innerText = getConfig().general.mapName;
}

export function openPopup(data: MapData) {
	setCurrentSelectedData(data);
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
	return getMapPath()
}

function setCurrentPath() {
	history.replaceState(null, '', getCurrentPath());
}

export function clickMapHandler(event: MapMouseEvent) {
	if (event.originalEvent.defaultPrevented) return;
	// @ts-ignore
	if (event.originalEvent.target?.dataset.objectType) {
		// @ts-ignore
		openPopup(getMapObjects()[event.originalEvent.target.dataset.objectId]);
	} else {
		closePopup();
	}
}

export function clickFeatureHandler(event: LayerClickInfo<Feature>) {
	event.event.originalEvent.preventDefault();
	if (!event.features) return;

	let clickedFeature: Feature = event.features[0];

	event.features.forEach((f) => {
		if (f.geometry.coordinates[1] < clickedFeature.geometry.coordinates[1]) {
			clickedFeature = f;
		}
	});

	openPopup(getMapObjects()[clickedFeature.properties.id]);
}