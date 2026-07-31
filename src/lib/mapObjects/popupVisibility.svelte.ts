import { getMap } from "@/lib/map/map.svelte";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import { isMenuSidebar } from "$lib/utils/device";
import type { PaddingOptions } from "maplibre-gl";

type PopupOcclusion = { width: number } | { height: number };

export type PopupVisibilityRequest = {
	data: MapData;
	bounds?: [number, number, number, number];
};

let visibilityRequest: PopupVisibilityRequest | undefined = $state();
let popupOcclusion: PopupOcclusion | undefined;

export function requestPopupVisibilityCheck(
	data: MapData,
	bounds?: [number, number, number, number]
) {
	visibilityRequest = { data, bounds };
}

export function clearPopupVisibilityCheck() {
	visibilityRequest = undefined;
}

export function getPopupVisibilityRequest() {
	return visibilityRequest;
}

export function setPopupOcclusion(occlusion: PopupOcclusion | undefined) {
	popupOcclusion = occlusion;
}

export function getPopupFitPadding(edgePadding: number = 64): PaddingOptions {
	const desktopMenuWidth =
		typeof document === "undefined"
			? 0
			: (document.querySelector<HTMLElement>("[data-map-desktop-menu]")?.getBoundingClientRect()
					.width ?? 0);

	return {
		top: edgePadding,
		right: edgePadding + (popupOcclusion && "width" in popupOcclusion ? popupOcclusion.width : 0),
		bottom:
			edgePadding + (popupOcclusion && "height" in popupOcclusion ? popupOcclusion.height : 0),
		left: edgePadding + desktopMenuWidth
	};
}

export function centerRequestedMapObjectIfPopupCovers(
	request: PopupVisibilityRequest,
	popup: PopupOcclusion
) {
	setPopupOcclusion(popup);
	if (request !== visibilityRequest) return;
	const { data, bounds } = request;

	const map = getMap();
	if (!map) return;

	if (bounds) {
		map.fitBounds(bounds, { padding: getPopupFitPadding(), maxZoom: 17 });
		return;
	}

	const point = map.project([data.lon, data.lat]);
	const container = map.getContainer();
	const isCovered =
		"width" in popup
			? point.x >= container.clientWidth - popup.width
			: point.y >= container.clientHeight - popup.height;

	if (isCovered) {
		map.panTo([data.lon, data.lat], {
			offset: "width" in popup ? [-popup.width / 2, 0] : [0, -popup.height / 2],
			duration: isMenuSidebar() ? 900 : 700
		});
	}
}
