import type { MapData } from '@/lib/types/mapObjectData/mapObjects';
import { updateSelected } from '@/lib/map/featuresGen.svelte';
import { updateMapObjectsGeoJson } from '@/lib/map/featuresManage.svelte';
import { goto } from '$app/navigation';
import { getCurrentPath } from '@/lib/mapObjects/interact';

let currentSelectedData: MapData | null = $state(null);

export function setCurrentSelectedData(data: MapData | null) {
	currentSelectedData = data
	updateSelected(currentSelectedData)
}

export function getCurrentSelectedData() {
	return currentSelectedData;
}

export function getCurrentSelectedMapId() {
	return $state.snapshot(currentSelectedData?.mapId) || '';
}