import { ExternalMapProvider, getUserSettings } from "@/lib/services/userSettings.svelte";
import { isNative } from "@/lib/native/runtime";
import type { Coords } from "@/lib/utils/coordinates";

function getLinkGoogleMaps(coords: Coords) {
	return `https://maps.google.com?q=${coords.lat},${coords.lon}`;
}

function getLinkNative(coords: Coords, name: string | undefined) {
	const query = name ? `${coords.lat},${coords.lon}(${name})` : `${coords.lat},${coords.lon}`;
	return `geo:${coords.lat},${coords.lon}?q=${encodeURIComponent(query)}`;
}

function getLinkAppleMaps(coords: Coords, name: string | undefined = undefined) {
	let link = `https://maps.apple.com/?ll=${coords.lat},${coords.lon}`;
	if (name) {
		link += `&q=${encodeURIComponent(name)}`;
	}
	return link;
}

export function getMapsUrl(coords: Coords, name: string | undefined = undefined) {
	if (isNative()) {
		return getLinkNative(coords, name);
	}
	if (getUserSettings().externalMapProvider === ExternalMapProvider.APPLE) {
		return getLinkAppleMaps(coords, name);
	}
	return getLinkGoogleMaps(coords);
}
