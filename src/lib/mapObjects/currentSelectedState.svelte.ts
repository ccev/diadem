import type { MapData } from '@/lib/types/mapObjectData/mapObjects';

let currentSelectedData: MapData | null = $state(null);

export function setCurrentSelectedData(data: MapData | null) {
	currentSelectedData = data
}

export function getCurrentSelectedData() {
	return currentSelectedData;
}

export function getCurrentSelectedMapId() {
	return $state.snapshot(currentSelectedData?.mapId) || '';
}