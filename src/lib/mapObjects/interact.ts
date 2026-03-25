import { getConfig } from "@/lib/services/config/config";
import type { MapMouseEvent } from "maplibre-gl";
import type { MapObjectFeature } from "@/lib/map/featuresGen.svelte.js";
import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte.js";
import { getCurrentSelectedData, setCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
import { getMapPath } from "@/lib/utils/getMapPath";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import { getMap } from "@/lib/map/map.svelte";
import { CoverageMapLayerId, MapObjectLayerId, RoutePathLayerId } from "@/lib/map/layers";
import { setRouteAnchorFortId } from "@/lib/map/routePaths.svelte";
import { closeMenu, getOpenedMenu, Menu } from "@/lib/ui/menus.svelte";
import {
	type CoverageMapAreaProperties,
	getIsCoverageMapActive,
	setClickedCoverageMapAreas
} from "@/lib/features/coverageMap.svelte";
import type { Feature, Polygon } from "geojson";
import { setCurrentScoutCenter } from "@/lib/features/scout.svelte";
import { Coords } from "@/lib/utils/coordinates";

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

	if (getIsCoverageMapActive()) {
		// @ts-ignore this is ok
		const areas = map.queryRenderedFeatures(event.point, {
			layers: [CoverageMapLayerId.POLYGON_FILL]
		}) as Feature<Polygon, CoverageMapAreaProperties>[]

		if (areas.length === 0) {
			setClickedCoverageMapAreas(undefined)
		} else {
			setClickedCoverageMapAreas(areas)
		}
	} else if (getOpenedMenu() === Menu.SCOUT) {
		setCurrentScoutCenter(Coords.infer(event.lngLat));
	} else {
		// Check route path lines first (keep existing anchor fort)
		const routePathFeatures = map.queryRenderedFeatures(event.point, {
			layers: [RoutePathLayerId.LINE]
		})
		if (routePathFeatures.length > 0) {
			const mapId = routePathFeatures[0].properties?.mapId
			if (mapId && getMapObjects()[mapId]) {
				openPopup(getMapObjects()[mapId])
				return
			}
		}

		const features = map.queryRenderedFeatures(event.point, {
			layers: Object.values(MapObjectLayerId)
		})

		// @ts-ignore
		const feature = features[0] as MapObjectFeature

		if (feature) {
			// Set anchor fort when clicking a route icon
			if ('fortId' in feature.properties && feature.properties.fortId) {
				setRouteAnchorFortId(feature.properties.fortId as string)
			}
			openPopup(getMapObjects()[feature.properties.id])
		} else {
			closeMenu()
			closePopup()
		}
	}
}