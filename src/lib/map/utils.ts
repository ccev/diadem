import { closePopup } from "@/lib/mapObjects/interact";
import { getMap } from "@/lib/map/map.svelte";
import type { Coords } from "@/lib/utils/coordinates";

export function isWebglSupported() {
	if (window.WebGLRenderingContext) {
		const canvas = document.createElement("canvas");
		try {
			const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
			if (context && typeof context.getParameter == "function") {
				return true;
			}
		} catch (e) {}
		return null;
	}
	return false;
}

export function flyTo(center: Coords, zoom: number) {
	closePopup();
	getMap()?.setCenter(center.maplibre());
	getMap()?.setZoom(zoom);
	getMap()?.setBearing(0);
	getMap()?.setPitch(0);
}