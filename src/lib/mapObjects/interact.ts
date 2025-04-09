import { getConfig } from '@/lib/config';
import type { MapMouseEvent } from 'maplibre-gl';
import { setIsContextMenuOpen } from '@/components/ui/contextmenu/utils.svelte';
import type { LayerClickInfo } from 'svelte-maplibre';
import type { Feature } from '@/lib/mapObjects/mapFeaturesGen.svelte.js';
import type { MapData } from '@/lib/types/mapObjectData/mapObjects';
import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte.js';
import { getCurrentSelectedData, setCurrentSelectedData } from '@/lib/mapObjects/currentSelectedState.svelte';

export function closePopup() {
	setCurrentSelectedData(null);
	setCurrentPath();

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
	if (!data) {
		return '/';
	}
	return `/${data.type}/${data.id}`;
}

function setCurrentPath() {
	history.replaceState(null, '', getCurrentPath());
}

export function clickMapHandler(event: MapMouseEvent) {
	setIsContextMenuOpen(false);

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