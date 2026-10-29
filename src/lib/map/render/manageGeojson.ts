import { MapSourceId } from "@/lib/map/layers";
import { getMap } from "@/lib/map/map.svelte.js";
import {
	isFeatureIcon,
	type MapObjectFeature,
	type MapObjectIconProperties
} from "@/lib/map/render/featureTypes";
import { ensureMapImage, getMapImageId } from "@/lib/map/render/images";
import type * as maplibre from "maplibre-gl";

let mapObjectFeatures: MapObjectFeature[] = [];
let publicationVersion = 0;
let publishedSource: maplibre.GeoJSONSource | undefined;
let nextImageRetry = Infinity;
const pendingImagePublications = new WeakMap<maplibre.Map, { version: number }>();

function getMapObjectsSource(map: maplibre.Map) {
	try {
		return map.getSource<maplibre.GeoJSONSource>(MapSourceId.MAP_OBJECTS);
	} catch {
		return;
	}
}

export function needsMapObjectsGeoJsonUpdate() {
	const map = getMap();
	return Boolean(
		map &&
		!map._removed &&
		(nextImageRetry <= Date.now() || getMapObjectsSource(map) !== publishedSource)
	);
}

function publishMapObjectsGeoJson(map: maplibre.Map, skipSource?: maplibre.GeoJSONSource) {
	if (map._removed) return;
	const source = getMapObjectsSource(map);
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
	if (!map || map._removed) return;
	publishedSource = publishMapObjectsGeoJson(map);
	loadMapImages(map, version);
}

export function refreshMapObjectsGeoJson() {
	const map = getMap();
	if (!map || map._removed) return;
	// A new source needs the cached data; failed images only need another load attempt.
	publishedSource = publishMapObjectsGeoJson(map, publishedSource);
	loadMapImages(map, publicationVersion);
}

function loadMapImages(map: maplibre.Map, version: number) {
	nextImageRetry = Infinity;
	const images = new Map<string, MapObjectIconProperties>();
	for (const feature of mapObjectFeatures) {
		if (!isFeatureIcon(feature)) continue;
		const props = feature.properties;
		const imageId = getMapImageId(props);
		if (props.imageId && props.imageUrl && !map.hasImage(imageId)) {
			images.set(imageId, props);
		}
	}

	for (const props of images.values()) {
		void ensureMapImage(map, props)
			.catch(() => undefined)
			.then(() => {
				if (getMap() !== map || map._removed) return;
				if (!map.hasImage(getMapImageId(props))) {
					// Retry on a later poll, without repeatedly retrying during one progressive batch.
					if (version === publicationVersion) nextImageRetry = Date.now() + 1000;
					return;
				}
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
