import { Coords } from "@/lib/utils/coordinates";
import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte.js";
import { replacePageState } from "@/lib/ui/overlays.svelte";

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
	replacePageState(window.location.origin + window.location.pathname);
}

export function getInitialMapPositionMain() {
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
