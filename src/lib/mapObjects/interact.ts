import { page } from "$app/state";
import { setCurrentScoutCenter } from "@/lib/features/scout.svelte";
import { updateFeatures } from "@/lib/map/featuresGen.svelte";
import { MapObjectLayerId } from "@/lib/map/layers";
import { getMap } from "@/lib/map/map.svelte";
import { isFeatureIcon, type MapObjectFeature } from "@/lib/map/render/featureTypes";
import {
	getCurrentSelectedData,
	setCurrentSelectedData
} from "@/lib/mapObjects/currentSelectedState.svelte";
import {
	clearPopupPreservedRoutes,
	getMapObjects
} from "@/lib/mapObjects/mapObjectsState.svelte.js";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import {
	clearPopupVisibilityCheck,
	requestPopupVisibilityCheck
} from "@/lib/mapObjects/popupVisibility.svelte";
import { updateAllMapObjects, updateMapObject } from "@/lib/mapObjects/updateMapObject";
import { getConfig } from "@/lib/services/config/config";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { closeMenu, getOpenedMenu, Menu } from "@/lib/ui/menus.svelte";
import { Coords } from "@/lib/utils/coordinates";
import { getMapPath } from "@/lib/utils/getMapPath";
import type { MapMouseEvent } from "maplibre-gl";
import { ClientMapObjectType, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getFocusedRouteMapId, setFocusedRouteMapId } from "$lib/features/focusedRoute.svelte.js";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { getRouteBounds, getRouteEndpointFort } from "@/lib/utils/routeUtils";
import {
	closeOverlay,
	getOverlayPayload,
	initializeOverlay,
	openOverlay,
	replacePageState,
	registerOverlayHandler
} from "@/lib/ui/overlays.svelte";
import {
	abortLocationDetails,
	createLocationData,
	getLocationPath,
	getSelectedLocation,
	loadLocationDetails
} from "$lib/features/location.svelte";

let routePopupController: AbortController | undefined;

registerOverlayHandler("map-popup", (entries) => {
	const entry = entries.at(-1);
	const selection = getOverlayPayload<{ data: MapData; isOverwrite: boolean }>(entry);
	if (getSelectedLocation() && selection?.data.type !== ClientMapObjectType.LOCATION)
		abortLocationDetails();
	const focusedRouteMapId = getFocusedRouteMapId();
	if (focusedRouteMapId && selection?.data.mapId !== focusedRouteMapId) setFocusedRouteMapId(null);
	setCurrentSelectedData(selection?.data ?? null, selection?.isOverwrite ?? false);
	if (
		selection?.data.type === ClientMapObjectType.LOCATION &&
		(selection.data.isAddressLoading || selection.data.isNearbyLoading)
	) {
		void loadLocationDetails(selection.data);
	}
});

export function closePopup() {
	abortLocationDetails();
	routePopupController?.abort();
	routePopupController = undefined;
	clearPopupVisibilityCheck();
	setFocusedRouteMapId(null);
	clearPopupPreservedRoutes();
	setCurrentSelectedData(null);
	if (!closeOverlay({ kind: "map-popup", id: "selected" }, getCurrentPath())) setCurrentPath();

	// call this to remove selected data (if needed)
	updateAllMapObjects(true, true).then();
}

export function openPopup(
	data: MapData,
	isOverwrite: boolean = false,
	options: { initialize?: boolean } = {}
) {
	routePopupController?.abort();
	routePopupController = undefined;
	abortLocationDetails();
	const focusedRouteMapId = getFocusedRouteMapId();
	if (focusedRouteMapId && focusedRouteMapId !== data.mapId) setFocusedRouteMapId(null);
	setCurrentSelectedData(data, isOverwrite);

	const overlay = { kind: "map-popup" as const, id: "selected", data: { data, isOverwrite } };
	const path = getCurrentPath({ data });
	if (options.initialize) {
		initializeOverlay(overlay, path, getMapPath(getConfig()), ["map-popup"]);
	} else {
		openOverlay(overlay, path);
	}

	if (
		(data.type === MapObjectType.POKESTOP || data.type === MapObjectType.GYM) &&
		!getUserSettings().filters.route.enabled
	) {
		const controller = new AbortController();
		routePopupController = controller;
		updateMapObject(
			MapObjectType.ROUTE,
			true,
			{ ...getUserSettings().filters.route, enabled: true },
			controller.signal
		)
			.then(() => {
				if (!controller.signal.aborted) updateFeatures(getMapObjects());
			})
			.finally(() => {
				if (routePopupController === controller) routePopupController = undefined;
			});
	}
}

export function openLocationPopup(
	coords: Coords,
	options: { replace?: boolean; zoom?: number; isCurrentLocation?: boolean } = {}
) {
	const data = createLocationData(coords, options.zoom, options.isCurrentLocation);
	requestPopupVisibilityCheck(data);
	openPopup(data, false, { initialize: options.replace });
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
		if (data.type === ClientMapObjectType.LOCATION) return getLocationPath(data);
		if (
			(data.type === MapObjectType.POKESTOP || data.type === MapObjectType.GYM) &&
			data.isRouteEndpoint
		) {
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
				data = getRouteEndpointFort(
					Object.values(getMapObjects()).filter(
						(object): object is RouteData => object.type === MapObjectType.ROUTE
					),
					feature.properties.routeEndpointFortId
				);
			}
			if (!data) return;
			requestPopupVisibilityCheck(
				data,
				data.type === MapObjectType.ROUTE ? getRouteBounds(data) : undefined
			);
			openPopup(data);
		} else {
			closeMenu();
			closePopup();
		}
	}
}
