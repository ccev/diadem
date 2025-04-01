import maplibre, { type LngLatBounds, type MapMouseEvent } from 'maplibre-gl';
import type { LayerClickInfo } from 'svelte-maplibre';
import type { Feature } from 'geojson';
import type { MapData, MapObjectType } from '@/lib/types/mapObjectData/mapObjects';
import { getDirectLinkObject, setDirectLinkObject } from '@/lib/directLinks.svelte';
import { openToast } from '@/components/ui/toast/toastUtils.svelte';
import * as m from "@/lib/paraglide/messages"
import { getConfig } from '@/lib/config';
import { setIsContextMenuOpen } from '@/components/ui/contextmenu/utils.svelte';
import { updateMapObject } from '@/lib/mapObjects/updateMapObject';

export type MapObjectsStateType = {
	[key: string]: MapData;
}

let currentSelectedData: MapData | null = $state(null);
let mapObjectsState: MapObjectsStateType = $state({});
const allMapTypes: MapObjectType[] = ["pokemon", "pokestop", "gym", "station"]

export async function updateAllMapObjects(map: maplibre.Map, removeOld: boolean = true) {
	await Promise.all(allMapTypes.map(type => {
		updateMapObject(map, type, removeOld)
	}))

	const directLinkData = getDirectLinkObject()
	if (directLinkData) {
		const mapObjectData = mapObjectsState[directLinkData.id]
		if (mapObjectData) {
			openPopup(mapObjectData)
		} else {
			openToast(m.direct_link_not_found({type: m["pogo_" + directLinkData.type]()}), 5000)
		}
		setDirectLinkObject(undefined)
	}
}

export function getCurrentSelectedData() {
	return currentSelectedData;
}

export function closePopup() {
	currentSelectedData = null;
	setCurrentPath()

	const title = document.head.querySelector("title")
	if (title) title.innerText = getConfig().general.mapName
}

function openPopup(data: MapData) {
	currentSelectedData = data;
	setCurrentPath()
}

export function updateCurrentPath() {
	if (!currentSelectedData) return
	if (window.location.pathname.includes(currentSelectedData.type)) return
	setCurrentPath()
}

export function getCurrentPath() {
	if (!currentSelectedData) {
		return '/';
	}
	return `/${currentSelectedData.type}/${currentSelectedData.id}`;
}

function setCurrentPath() {
	history.replaceState(null, '', getCurrentPath());
}

export function clickMapHandler(event: MapMouseEvent) {
	setIsContextMenuOpen(false)

	if (event.originalEvent.defaultPrevented) return;
	// @ts-ignore
	if (event.originalEvent.target?.dataset.objectType) {
		// @ts-ignore
		openPopup(
			mapObjectsState[event.originalEvent.target.dataset.objectId]
		);
	} else {
		closePopup();
	}
}

export function clickFeatureHandler(event: LayerClickInfo<Feature>) {
	event.event.originalEvent.preventDefault()
	if (event.features) {
		const props = event.features[0].properties;
		openPopup(mapObjectsState[props.id]);
	}
}

export function getMapObjects() {
	return mapObjectsState;
}

export function addMapObject(key: string, data: MapData) {
	mapObjectsState[key] = data;
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