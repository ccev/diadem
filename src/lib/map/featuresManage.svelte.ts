import type { FeatureCollection } from "geojson";
import { isFeatureIcon, type MapObjectFeature } from "@/lib/map/render/featureBuilders";
import { getMap } from "@/lib/map/map.svelte";
import { ensureMapImage, ensureMapImages } from "@/lib/map/images";
import { MapSourceId, updateMapGeojsonSource } from "@/lib/map/layers";

let mapObjectsGeoJson: FeatureCollection = {
	type: "FeatureCollection",
	features: []
};

export function updateMapObjectsGeoJson(features: MapObjectFeature[]) {
	mapObjectsGeoJson = { type: "FeatureCollection", features };

	const map = getMap();
	if (!map) return;

	ensureMapImages(
		map,
		features
			.filter((f) => isFeatureIcon(f))
			.filter((f) => f.properties.imageUrl)
			.map((f) => f.properties.imageUrl)
	).then(() => {
		updateMapGeojsonSource(MapSourceId.MAP_OBJECTS, mapObjectsGeoJson);
	});
}
