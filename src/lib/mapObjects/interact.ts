import { getConfig } from "@/lib/services/config/config";
import type { MapMouseEvent } from "maplibre-gl";
import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte.js";
import {
	getCurrentSelectedData,
	setCurrentSelectedData
} from "@/lib/mapObjects/currentSelectedState.svelte";
import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
import { getMapPath } from "@/lib/utils/getMapPath";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import { getMap } from "@/lib/map/map.svelte";
import { CoverageMapLayerId, MapObjectLayerId } from "@/lib/map/layers";
import { closeMenu, getOpenedMenu, Menu } from "@/lib/ui/menus.svelte";
import { setCurrentScoutCenter } from "@/lib/features/scout.svelte";
import { Coords } from "@/lib/utils/coordinates";
import type { MapObjectFeature } from "@/lib/map/render/featureTypes";
import { page } from "$app/state";

export function closePopup() {
	setCurrentSelectedData(null);
	setCurrentPath();

	// call this to remove selected data (if needed)
	updateAllMapObjects(true, true).then();

	const title = document.head.querySelector("title");
	if (title) title.innerText = getConfig().general.mapName;
}

export function openPopup(data: MapData, isOverwrite: boolean = false) {
	setCurrentSelectedData(data, isOverwrite);
	setCurrentPath();
}

export function updateCurrentPath() {
	const data = getCurrentSelectedData();
	if (!data) return;
	if (window.location.pathname.includes(data.type)) return;
	setCurrentPath();
}

export function getCurrentPath() {
	const data = getCurrentSelectedData();
	if (data) {
		return `/${data.type}/${data.id}`;
	}

	if (getMap()) {
		return getMapPath(getConfig());
	}

	return page.url.pathname;
}

function setCurrentPath() {
	history.replaceState(null, "", getCurrentPath());
}

export function clickMapHandler(event: MapMouseEvent) {
	if (event.originalEvent.defaultPrevented) return;

	const map = getMap();
	if (!map) return;

	if (getOpenedMenu() === Menu.SCOUT) {
		setCurrentScoutCenter(Coords.infer(event.lngLat));
	} else {
		const features = map.queryRenderedFeatures(event.point, {
			layers: Object.values(MapObjectLayerId)
		});

		const mapFeatures = features as unknown as MapObjectFeature[];
		const feature =
			mapFeatures.find(
				(feature) =>
					!("isModifierUnderlay" in feature.properties) || !feature.properties.isModifierUnderlay
			) ?? mapFeatures[0];

		if (feature) {
			openPopup(getMapObjects()[feature.properties.id]);
		} else {
			closeMenu();
			closePopup();
		}
	}
}
