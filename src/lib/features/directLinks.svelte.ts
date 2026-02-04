import  { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { openPopup } from "@/lib/mapObjects/interact";
import { addMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
import { Coords } from "@/lib/utils/coordinates";
import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
import { getMap } from "@/lib/map/map.svelte";
import { openToast } from "@/lib/ui/toasts.svelte";
import * as m from "@/lib/paraglide/messages";

let directLinkObject: MapData | undefined = $state(undefined);

export function getDirectLinkObject() {
	return directLinkObject;
}

export function setDirectLinkObject(data: MapData) {
	directLinkObject = data;
}

export function openMapObject(data: MapData, alwaysFly: boolean = false) {
	openPopup(data, true);
	addMapObjects([data], data.type, 1);

	const map = getMap()
	if (!map) return

	if (alwaysFly || !map.getBounds().contains(Coords.infer(data).maplibre())) {
		getUserSettings().mapPosition.center.lat = data.lat;
		getUserSettings().mapPosition.center.lng = data.lon;
		getUserSettings().mapPosition.zoom = 18;
		updateUserSettings();

		map.setCenter({ lat: data.lat, lng: data.lon });
		map.setZoom(17);
	}
}

export async function openMapObjectFromId(type: MapObjectType, id: string) {
	const response = await fetch("/api/" + type + "/" + id)
	if (!response.ok) {
		openToast(m.direct_link_not_found({ type: m["pogo_" + type]() }), 1000);
		return
	}
	const data: MapData = await response.json()
	openMapObject(data, true)
}