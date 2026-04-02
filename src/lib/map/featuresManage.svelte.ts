import type { FeatureCollection } from "geojson";
import { isFeatureIcon, type MapObjectFeature } from "@/lib/map/featuresGen.svelte";
import { getMap } from "@/lib/map/map.svelte";
import { ensureMapImage } from "@/lib/map/images";
import { MapSourceId, updateMapGeojsonSource } from "@/lib/map/layers";

let mapObjectsGeoJson: FeatureCollection = {
	type: "FeatureCollection",
	features: []
};

let sessionImageUrls = new Set<string>();

export function updateMapObjectsGeoJson(features: MapObjectFeature[]) {
	mapObjectsGeoJson = { type: "FeatureCollection", features };

	// updateMapGeojsonSource(MapSourceId.MAP_OBJECTS, mapObjectsGeoJson);
	Promise.all(
		features
			.filter((f) => isFeatureIcon(f))
			.map((f) => {
				return addMapImage(f.properties?.imageUrl);
			})
	).then(() => {
		updateMapGeojsonSource(MapSourceId.MAP_OBJECTS, mapObjectsGeoJson);
	});
}

export function clearSessionImageUrls() {
	sessionImageUrls.clear();
}

export function getMapObjectsGeoJson() {
	return mapObjectsGeoJson;
}

async function addMapImage(url: string) {
	if (!url) return;

	const map = getMap();
	if (!map) return;

	if (sessionImageUrls.has(url)) return;
	sessionImageUrls.add(url);
	await ensureMapImage(map, url);
}
