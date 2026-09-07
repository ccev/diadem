import { openLocationPopup } from "$lib/mapObjects/interact";
import { setCurrentScoutCenter } from "$lib/features/scout.svelte";
import { getOpenedMenu, Menu } from "$lib/ui/menus.svelte";
import { Coords } from "$lib/utils/coordinates";
import type { MapMouseEvent, MapTouchEvent } from "maplibre-gl";

export let pressTimer: ReturnType<typeof setTimeout>[] = [];
export const longPressDuration = 500;

export function onLocationContext(event: MapTouchEvent | MapMouseEvent) {
	const coords = Coords.infer(event.lngLat);
	if (getOpenedMenu() === Menu.SCOUT) {
		setCurrentScoutCenter(coords);
		return;
	}

	event.preventDefault();
	openLocationPopup(coords);
}

export function clearPressTimer() {
	pressTimer.forEach((timer) => clearTimeout(timer));
	pressTimer = [];
}
