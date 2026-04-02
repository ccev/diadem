import type { Coords } from "@/lib/utils/coordinates";
import { ExternalMapProvider, getUserSettings } from "@/lib/services/userSettings.svelte";

function getLinkGoogleMaps(coords: Coords) {
	return `https://maps.google.com?q=${coords.lat},${coords.lon}`;
}

function getLinkAppleMaps(coords: Coords, name: string | undefined = undefined) {
	let link = `https://maps.apple.com/?ll=${coords.lat},${coords.lon}`;
	if (name) {
		link += `&q=${encodeURIComponent(name)}`;
	}
	return link;
}

export function getMapsUrl(coords: Coords, name: string | undefined = undefined) {
	if (getUserSettings().externalMapProvider === ExternalMapProvider.APPLE) {
		return getLinkAppleMaps(coords, name);
	}
	return getLinkGoogleMaps(coords);
}
