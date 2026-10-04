import { MapSourceId } from "@/lib/map/layers";
import { getMap } from "@/lib/map/map.svelte.js";
import { isFeatureIcon, type MapObjectFeature } from "@/lib/map/render/featureTypes";
import { ensureMapImage, getMapImageId } from "@/lib/map/render/images";
import type * as maplibre from "maplibre-gl";

let mapObjectFeatures: MapObjectFeature[] = [];
let publicationVersion = 0;
let publishedSource: maplibre.GeoJSONSource | undefined;
const pendingImagePublications = new WeakMap<maplibre.Map, { version: number }>();

function publishMapObjectsGeoJson(map: maplibre.Map, skipSource?: maplibre.GeoJSONSource) {
	if (map._removed) return;
	let source: maplibre.GeoJSONSource | undefined;
	try {
		source = map.getSource<maplibre.GeoJSONSource>(MapSourceId.MAP_OBJECTS);
	} catch {
		return;
	}
	if (!source || source === skipSource) return source;
	source.setData({
		type: "FeatureCollection",
		features: mapObjectFeatures.filter((feature) => {
			if (!isFeatureIcon(feature)) return true;

			const imageId = getMapImageId(feature.properties);
			return imageId ? map.hasImage(imageId) : true;
		})
	});
	return source;
}

export function updateMapObjectsGeoJson(features: MapObjectFeature[]) {
	mapObjectFeatures = features;
	const version = ++publicationVersion;
	publishedSource = undefined;

	const map = getMap();
	if (!map) return;
	publishedSource = publishMapObjectsGeoJson(map);

	const images = [
		...new Map(
			features
				.filter(isFeatureIcon)
				.map((f) => f.properties)
				.filter((props) => props.imageId && props.imageUrl && !map.hasImage(getMapImageId(props)))
				.map((props) => [getMapImageId(props), props])
		).values()
	];

	for (const props of images) {
		void ensureMapImage(map, props)
			.catch(() => undefined)
			.then(() => {
				if (getMap() !== map || map._removed) return;
				const pending = pendingImagePublications.get(map);
				if (pending) {
					pending.version = Math.max(pending.version, version);
					return;
				}
				const publication = { version };
				pendingImagePublications.set(map, publication);
				// Publish ready icons in short batches without waiting for the slowest image.
				setTimeout(() => {
					pendingImagePublications.delete(map);
					if (getMap() !== map || map._removed) return;
					// Skip obsolete work only if the latest collection reached the current source.
					publishedSource = publishMapObjectsGeoJson(
						map,
						publication.version !== publicationVersion ? publishedSource : undefined
					);
				}, 32);
			});
	}
}
