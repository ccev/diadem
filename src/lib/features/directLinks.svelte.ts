import type { MapData } from "@/lib/mapObjects/mapObjectTypes";

let directLinkObject: MapData | undefined = $state(undefined);

export function getDirectLinkObject() {
	return directLinkObject;
}

export function setDirectLinkObject(data: MapData) {
	directLinkObject = data;
}
