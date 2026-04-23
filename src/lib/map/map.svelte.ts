import maplibre from "maplibre-gl";
import { getUserSettings } from "@/lib/services/userSettings.svelte";

let map: maplibre.Map | undefined = $state(undefined);
let mapStyleVersion = $state(0);

export function getMap() {
	return map;
}

export function setMap(newMap: maplibre.Map | undefined) {
	map = newMap;
}

export function resetMap(map: maplibre.Map | undefined = undefined) {
	(map ?? getMap())?.easeTo({
		bearing: 0,
		pitch: 0
	});
}

export function addMapStyleVersion() {
	mapStyleVersion += 1;
}

export function getMapStyleVersion() {
	return mapStyleVersion;
}

export function handleRotatePitchDisable(map: maplibre.Map) {
	if (!getUserSettings().enableRotatePitch) {
		map.dragRotate.disable();
		map.keyboard.disableRotation();
		map.touchZoomRotate.disableRotation();
		map.touchPitch.disable();
	} else {
		map.dragRotate.enable();
		map.keyboard.enableRotation();
		map.touchZoomRotate.enableRotation();
		map.touchPitch.enable();
	}
}
