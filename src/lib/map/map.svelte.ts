import maplibre from "maplibre-gl";
import { closeMenu, openMenu } from "@/lib/ui/menus.svelte.js";

let map: maplibre.Map | undefined = $state(undefined);
let mapStyleVersion = $state(0)

export function getMap() {
	return map;
}

export function setMap(newMap: maplibre.Map | undefined) {
	map = newMap;
}

export function resetMap() {
	closeMenu()
	// closePopup();
	map?.easeTo({
		bearing: 0,
		pitch: 0
	});
}

export function addMapStyleVersion() {
	mapStyleVersion += 1
}

export function getMapStyleVersion() {
	return mapStyleVersion
}