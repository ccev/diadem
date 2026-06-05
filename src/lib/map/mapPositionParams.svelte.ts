import { replaceState } from "$app/navigation";
import { Coords } from "@/lib/utils/coordinates";
import maplibre from "maplibre-gl";
import { setMap } from "@/lib/map/map.svelte.js";
import { onMapDragStart, onMapMoveEnd, onMapMoveStart, onTouchStart } from "@/lib/map/events";
import { clearPressTimer, onContextMenu } from "@/lib/ui/contextmenu.svelte.js";
import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte.js";

export function getMapPositionFromUrlParams(): [Coords | undefined, number | undefined] {
	let zoom: number | undefined = undefined;
	let center: Coords | undefined = undefined;

	const params = new URLSearchParams(window.location.search);

	const paramLat = Number(params.get("lat") ?? undefined);
	const paramLon = Number(params.get("lon") ?? undefined);
	const paramZoom = Number(params.get("zoom") ?? undefined);

	if (Number.isFinite(paramLat) && Number.isFinite(paramLon)) {
		center = new Coords(paramLat, paramLon);
	}

	if (Number.isFinite(paramZoom)) {
		zoom = paramZoom;
	}

	return [center, zoom];
}

export function clearMapPositionUrlParams() {
	if (!window.location.search) return;
	replaceState(window.location.origin + window.location.pathname, {});
}

export function getInitialMapPoisitionMain() {
	const [center, zoom] = getMapPositionFromUrlParams();
	const userSettings = getUserSettings();
	if (center) {
		userSettings.mapPosition.center.lat = center.lat;
		userSettings.mapPosition.center.lng = center.lon;
	}
	if (zoom) {
		userSettings.mapPosition.zoom = zoom;
	}
	if (center || zoom) {
		updateUserSettings();
	}

	return $state.snapshot(getUserSettings().mapPosition);
}