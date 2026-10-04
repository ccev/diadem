import { openLocationPopup } from "@/lib/mapObjects/interact";
import { getMapObjectAtPoint } from "@/lib/map/hitTest";
import { setCurrentScoutCenter } from "@/lib/features/scout.svelte";
import { getOpenedMenu, Menu } from "@/lib/ui/menus.svelte";
import { Coords } from "@/lib/utils/coordinates";
import { openQuickActions } from "@/lib/ui/quickActions.svelte";
import { getPrimaryPopupActions } from "@/lib/ui/primaryPopupActions";
import { getShareTitle } from "@/lib/features/shareTexts";
import { longPressDuration } from "@/lib/ui/actions/quickPress";
import type { MapMouseEvent, MapTouchEvent } from "maplibre-gl";

export { longPressDuration };
export let pressTimer: ReturnType<typeof setTimeout>[] = [];
let suppressClickUntil = 0;

export function onMapTouchEnd() {
	clearPressTimer();
	if (suppressClickUntil) suppressClickUntil = Date.now() + 800;
}

export function resetMapPress() {
	clearPressTimer();
	suppressClickUntil = 0;
}

export function shouldSuppressMapClick() {
	return Date.now() < suppressClickUntil;
}

export function onLocationContext(event: MapTouchEvent | MapMouseEvent) {
	clearPressTimer();
	event.preventDefault();
	event.originalEvent.preventDefault();
	// A touch hold can also generate a browser contextmenu event.
	if (event.type === "contextmenu" && shouldSuppressMapClick()) return;
	if (
		event.type === "touchstart" ||
		("pointerType" in event.originalEvent && event.originalEvent.pointerType === "touch")
	)
		suppressClickUntil = Infinity;

	const coords = Coords.infer(event.lngLat);
	if (getOpenedMenu() === Menu.SCOUT) {
		setCurrentScoutCenter(coords);
		return;
	}

	const data = getMapObjectAtPoint(event.point);
	if (data) {
		const bounds = event.target.getCanvas().getBoundingClientRect();
		openQuickActions({
			x: bounds.left + event.point.x,
			y: bounds.top + event.point.y,
			title: getShareTitle(data),
			getActions: () => getPrimaryPopupActions(data),
			trigger: event.target.getCanvas()
		});
		return;
	}
	openLocationPopup(coords);
}

export function clearPressTimer() {
	pressTimer.forEach((timer) => clearTimeout(timer));
	pressTimer = [];
}
