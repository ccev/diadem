import { page } from "$app/state";
import { setCurrentScoutCenter } from "@/lib/features/scout.svelte";
import { MapObjectLayerId } from "@/lib/map/layers";
import { getMap } from "@/lib/map/map.svelte";
import { isFeatureIcon, type MapObjectFeature } from "@/lib/map/render/featureTypes";
import {
	getCurrentSelectedData,
	setCurrentSelectedData
} from "@/lib/mapObjects/currentSelectedState.svelte";
import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte.js";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import {
	clearPopupVisibilityCheck,
	requestPopupVisibilityCheck
} from "@/lib/mapObjects/popupVisibility.svelte";
import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
import { getConfig } from "@/lib/services/config/config";
import { closeMenu, getOpenedMenu, Menu } from "@/lib/ui/menus.svelte";
import { Coords } from "@/lib/utils/coordinates";
import { getMapPath } from "@/lib/utils/getMapPath";
import type { MapMouseEvent } from "maplibre-gl";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import {
	getFocusedRouteMapId,
	setFocusedRouteMapId
} from "@/lib/features/routes/routeDisplay.svelte";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { getRouteEndpointPokestop } from "@/lib/utils/routeUtils";
import {
	closeOverlay,
	getOverlayPayload,
	openOverlay,
	replacePageState,
	registerOverlayHandler
} from "@/lib/ui/overlays.svelte";

registerOverlayHandler("map-popup", (entries) => {
	const entry = entries.at(-1);
	const selection = getOverlayPayload<{ data: MapData; isOverwrite: boolean }>(entry);
	if (
		selection?.data.type === MapObjectType.POKESTOP ||
		(selection?.data.type === MapObjectType.ROUTE &&
			getFocusedRouteMapId() !== selection.data.mapId)
	)
		setFocusedRouteMapId(null);
	setCurrentSelectedData(selection?.data ?? null, selection?.isOverwrite ?? false);
});

export function closePopup() {
	clearPopupVisibilityCheck();
	setCurrentSelectedData(null);
	if (!closeOverlay({ kind: "map-popup", id: "selected" }, getCurrentPath())) setCurrentPath();

	// call this to remove selected data (if needed)
	updateAllMapObjects(true, true).then();
}

export function openPopup(data: MapData, isOverwrite: boolean = false) {
	if (
		data.type === MapObjectType.POKESTOP ||
		(data.type === MapObjectType.ROUTE && getFocusedRouteMapId() !== data.mapId)
	)
		setFocusedRouteMapId(null);
	setCurrentSelectedData(data, isOverwrite);
	openOverlay({ kind: "map-popup", id: "selected", data: { data, isOverwrite } }, getCurrentPath());
}

export function updateCurrentPath() {
	const data = getCurrentSelectedData();
	if (!data) return;
	if (window.location.pathname.includes(data.type)) return;
	setCurrentPath();
}

export function getCurrentPath(options: { data?: MapData } | undefined = undefined) {
	const data = options?.data ?? getCurrentSelectedData();
	if (data) {
		if (data.type === MapObjectType.POKESTOP && data.isRouteEndpoint) {
			return getMapPath(getConfig());
		}
		return `/${data.type}/${data.id}`;
	}

	if (getMap()) {
		return getMapPath(getConfig());
	}

	return page.url.pathname;
}

function setCurrentPath() {
	replacePageState(getCurrentPath());
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
			let data: MapData | undefined = getMapObjects()[feature.properties.id];
			if (!data && isFeatureIcon(feature) && feature.properties.routeEndpointFortId) {
				data = getRouteEndpointPokestop(
					Object.values(getMapObjects()).filter(
						(object): object is RouteData => object.type === MapObjectType.ROUTE
					),
					feature.properties.routeEndpointFortId
				);
			}
			if (!data) return;
			requestPopupVisibilityCheck(data);
			openPopup(data);
		} else {
			closeMenu();
			closePopup();
		}
	}
}
