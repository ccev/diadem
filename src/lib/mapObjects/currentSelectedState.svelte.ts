import { updateSelected } from '@/lib/map/featuresGen.svelte';
import { updateMapObjectsGeoJson } from '@/lib/map/featuresManage.svelte';
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";

let currentSelectedData: { data: MapData | null, isOverwrite: boolean } = $state({ data: null, isOverwrite: false });

export function setCurrentSelectedData(data: MapData | null, isOverwrite: boolean = false) {
	currentSelectedData.data = data
	currentSelectedData.isOverwrite = isOverwrite
	updateSelected(currentSelectedData.data)
}

export function getCurrentSelectedData() {
	return currentSelectedData.data;
}

export function getCurrentSelectedMapId() {
	return $state.snapshot(currentSelectedData.data?.mapId) || '';
}

export function isCurrentSelectedOverwrite() {
	return currentSelectedData.isOverwrite
}
