import { getCurrentPath, openLocationPopup } from "@/lib/mapObjects/interact";
import { getMapObjectAtPoint } from "@/lib/map/mapObjectsAtPoint";
import { setCurrentScoutCenter } from "@/lib/features/scout.svelte";
import { formattedCoordinates } from "@/lib/features/location.svelte";
import { getOpenedMenu, Menu } from "@/lib/ui/menus.svelte";
import { Coords } from "@/lib/utils/coordinates";
import {
	backupShareUrl,
	canNativeShare,
	copyToClipboard,
	hasClipboardWrite
} from "@/lib/utils/device";
import { getRootOrigin } from "@/lib/native/runtime";
import { m } from "@/lib/paraglide/messages";
import { getLocale } from "@/lib/paraglide/runtime";
import { Copy, Link, Share2 } from "@lucide/svelte";
import { openQuickActions } from "@/lib/ui/quickActions.svelte";
import { getPrimaryPopupActions } from "@/lib/ui/primaryPopupActions";
import { getPopupProps } from "@/lib/ui/popupProps";
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

	const data = getMapObjectAtPoint(event.point, { quickActions: true });
	if (data) {
		const actionCoords = new Coords(data.lat, data.lon);
		const bounds = event.target.getCanvas().getBoundingClientRect();
		openQuickActions({
			x: bounds.left + event.point.x,
			y: bounds.top + event.point.y,
			title: getPopupProps(data)?.title ?? "",
			getActions: () => {
				const actions = getPrimaryPopupActions(data, actionCoords.lat, actionCoords.lon);
				const path = getCurrentPath({ data });
				const url = new URL(getRootOrigin() + path);
				url.searchParams.set("lang", getLocale());
				const shareUrl = url.toString();
				if (canNativeShare({ url: shareUrl })) {
					actions.push({
						label: m.popup_share(),
						Icon: Share2,
						onclick: () => backupShareUrl(shareUrl)
					});
				} else if (hasClipboardWrite()) {
					actions.push({
						label: m.copy_link(),
						Icon: Link,
						onclick: () => copyToClipboard(shareUrl)
					});
				}
				if (hasClipboardWrite()) {
					actions.push({
						label: m.context_menu_copy_coordinates(),
						Icon: Copy,
						onclick: () => copyToClipboard(formattedCoordinates(actionCoords))
					});
				}
				return actions;
			},
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
