import maplibre from "maplibre-gl";
import { getOpenedMenu, Menu } from "@/lib/ui/menus.svelte.js";
import { setCurrentScoutCenter } from "@/lib/features/scout.svelte.js";
import { Coords } from "@/lib/utils/coordinates";

export let pressTimer: NodeJS.Timeout[] = [];
export const longPressDuration = 500;

let isContextMenuOpen: boolean = $state(false);
let contextMenuEvent: maplibre.MapTouchEvent | maplibre.MapMouseEvent | undefined =
	$state(undefined);

export function getIsContextMenuOpen() {
	return isContextMenuOpen;
}

export function setIsContextMenuOpen(state: boolean) {
	isContextMenuOpen = state;
}

export function getContextMenuEvent() {
	return contextMenuEvent;
}

export function setContextMenuEvent(event: maplibre.MapTouchEvent | maplibre.MapMouseEvent) {
	contextMenuEvent = event;
}

export function onContextMenu(event: maplibre.MapTouchEvent | maplibre.MapMouseEvent) {
	if (getOpenedMenu() === Menu.SCOUT) {
		setCurrentScoutCenter(Coords.infer(event.lngLat));
		return;
	}

	setContextMenuEvent(event);
	setIsContextMenuOpen(true);
}

export function clearPressTimer() {
	pressTimer.forEach((t) => clearTimeout(t));
	pressTimer = [];
}