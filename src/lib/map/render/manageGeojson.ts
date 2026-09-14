import { MapSourceId } from "@/lib/map/layers";
import { getMap } from "@/lib/map/map.svelte.js";
import { isFeatureIcon, type MapObjectFeature } from "@/lib/map/render/featureTypes";
import { ensureMapImage, getMapImageId } from "@/lib/map/render/images";
import type { FeatureCollection } from "geojson";
import type * as maplibre from "maplibre-gl";

let mapObjectsGeoJson: FeatureCollection = {
	type: "FeatureCollection",
	features: []
};
let publicationVersion = 0;
let publishedSource: maplibre.GeoJSONSource | undefined;

function publishMapObjectsGeoJson(map: maplibre.Map, skipSource?: maplibre.GeoJSONSource) {
	let source: maplibre.GeoJSONSource | undefined;
	try {
		source = map.getSource<maplibre.GeoJSONSource>(MapSourceId.MAP_OBJECTS);
	} catch {
		return;
	}
	if (!source || source === skipSource) return source;
	source.setData({
		type: "FeatureCollection",
		features: mapObjectsGeoJson.features.filter((feature) => {
			const mapObjectFeature = feature as MapObjectFeature;
			if (!isFeatureIcon(mapObjectFeature)) return true;

			const imageId = getMapImageId(mapObjectFeature.properties);
			return imageId ? map.hasImage(imageId) : true;
		})
	});
	return source;
}

export function updateMapObjectsGeoJson(features: MapObjectFeature[]) {
	mapObjectsGeoJson = { type: "FeatureCollection", features };
	const version = ++publicationVersion;
	publishedSource = undefined;

	const map = getMap();
	if (!map) return;
	publishedSource = publishMapObjectsGeoJson(map);

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
				// Skip superseded callbacks only if the latest collection reached this source.
				publishedSource = publishMapObjectsGeoJson(
					map,
					version !== publicationVersion ? publishedSource : undefined
				);
			});
	}
}
