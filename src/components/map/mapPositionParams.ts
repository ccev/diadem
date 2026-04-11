import { Coords } from "@/lib/utils/coordinates";

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

	history.replaceState({}, "", window.location.origin + window.location.pathname);

	return [center, zoom];
}
