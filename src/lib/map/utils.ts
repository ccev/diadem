import { getMap } from "@/lib/map/map.svelte";
import { closePopup } from "@/lib/mapObjects/interact";
import type { Coords } from "@/lib/utils/coordinates";

export function isWebglSupported() {
	if (window.WebGL2RenderingContext) {
		const canvas = document.createElement("canvas");
		try {
			const context = canvas.getContext("webgl2");
			if (context && typeof context.getParameter == "function") {
				return true;
			}
		} catch (e) {}
		return null;
	}
	return false;
}

export function jumpTo(center: Coords, zoom: number) {
	closePopup();
	getMap()?.setCenter(center.maplibre());
	getMap()?.setZoom(zoom);
	getMap()?.setBearing(0);
	getMap()?.setPitch(0);
}

export function flyTo(center: Coords, zoom: number) {
	closePopup();
	getMap()?.flyTo({
		center,
		zoom
	});
}
