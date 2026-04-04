import { updateSelected } from "@/lib/map/render/featuresGen.svelte.js";
import { updateMapObjectsGeoJson } from "@/lib/map/render/manageGeojson.js";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";

let currentSelectedData: { data: MapData | null; isOverwrite: boolean } = $state({
	data: null,
	isOverwrite: false
});

export function setCurrentSelectedData(data: MapData | null, isOverwrite: boolean = false) {
	currentSelectedData.data = data;
	currentSelectedData.isOverwrite = isOverwrite;
	updateSelected(currentSelectedData.data);
}

export function getCurrentSelectedData() {
	return currentSelectedData.data;
}

export function getCurrentSelectedMapId() {
	return $state.snapshot(currentSelectedData.data?.mapId) || "";
}

export function isCurrentSelectedOverwrite(mapId: string) {
	return currentSelectedData.isOverwrite && currentSelectedData.data?.mapId === mapId;
}
