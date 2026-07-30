import { getMap } from "@/lib/map/map.svelte";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import { isMenuSidebar } from "$lib/utils/device";

type PopupOcclusion = { width: number } | { height: number };

export type PopupVisibilityRequest = { data: MapData };

let visibilityRequest: PopupVisibilityRequest | undefined = $state();

export function requestPopupVisibilityCheck(data: MapData) {
	visibilityRequest = { data };
}

export function clearPopupVisibilityCheck() {
	visibilityRequest = undefined;
}

export function getPopupVisibilityRequest() {
	return visibilityRequest;
}

export function centerRequestedMapObjectIfPopupCovers(
	request: PopupVisibilityRequest,
	popup: PopupOcclusion
) {
	if (request !== visibilityRequest) return;
	const { data } = request;

	const map = getMap();
	if (!map) return;

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
