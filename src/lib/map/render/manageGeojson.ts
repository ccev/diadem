import { MapSourceId, updateMapGeojsonSource } from "@/lib/map/layers";
import { getMap } from "@/lib/map/map.svelte.js";
import { isFeatureIcon, type MapObjectFeature } from "@/lib/map/render/featureTypes";
import { ensureMapImage, getMapImageId } from "@/lib/map/render/images";
import type { FeatureCollection } from "geojson";
import type maplibre from "maplibre-gl";

let mapObjectsGeoJson: FeatureCollection = {
	type: "FeatureCollection",
	features: []
};

function getRenderableMapObjectsGeoJson(map: maplibre.Map): FeatureCollection {
	return {
		type: "FeatureCollection",
		features: mapObjectsGeoJson.features.filter((feature) => {
			const mapObjectFeature = feature as MapObjectFeature;
			if (!isFeatureIcon(mapObjectFeature)) return true;

			const imageId = getMapImageId(mapObjectFeature.properties);
			return imageId ? map.hasImage(imageId) : true;
		})
	};
}

export function updateMapObjectsGeoJson(features: MapObjectFeature[]) {
	mapObjectsGeoJson = { type: "FeatureCollection", features };

	const map = getMap();
	if (!map) return;

	updateMapGeojsonSource(map, MapSourceId.MAP_OBJECTS, getRenderableMapObjectsGeoJson(map));

	const images = [
		...new Map(
			features
				.filter((f) => isFeatureIcon(f))
				.map((f) => f.properties)
				.filter((props) => props.imageId && props.imageUrl && !map.hasImage(getMapImageId(props)))
				.map((props) => [getMapImageId(props), props])
		).values()
	];

	for (const props of images) {
		void ensureMapImage(map, props)
			.catch(() => undefined)
			.then(() => {
				if (getMap() !== map) return;
				updateMapGeojsonSource(map, MapSourceId.MAP_OBJECTS, getRenderableMapObjectsGeoJson(map));
			});
	}
}
