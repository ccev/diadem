import type { FeatureCollection } from "geojson";
import {
	isFeatureIcon,
	type MapObjectFeature,
	type MapObjectPolygonFeature
} from "@/lib/map/featuresGen.svelte";
import { getMap } from "@/lib/map/map.svelte";
import { getLoadedImages, setLoadedImage } from "@/lib/map/loadedImages.svelte";
import { MapSourceId, updateMapGeojsonSource } from "@/lib/map/layers";

let mapObjectsGeoJson: FeatureCollection<
	MapObjectPolygonFeature["geometry"],
	MapObjectPolygonFeature["properties"]
> = {
	type: "FeatureCollection",
	features: []
};

let sessionImageUrls= new Set<string>();

export function updateMapObjectsGeoJson(features: MapObjectFeature[]) {
	mapObjectsGeoJson = { type: "FeatureCollection", features };

	// updateMapGeojsonSource(MapSourceId.MAP_OBJECTS, mapObjectsGeoJson);
	Promise.all(
		mapObjectsGeoJson.features
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
	const map = getMap();
	if (!map) return;

	if (sessionImageUrls.has(url)) return;
	sessionImageUrls.add(url);

	let imageData = getLoadedImages()[url];
	if (!imageData) {
		const image = await map.loadImage(url);
		imageData = image.data;
		setLoadedImage(url, imageData);
	}

	if (!map.hasImage(url)) {
		map.addImage(url, imageData);
	}
}