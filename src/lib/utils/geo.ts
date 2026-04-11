import type { BBox, Feature, Position } from "geojson";
import { bbox, centroid } from "@turf/turf";
import { Coords } from "@/lib/utils/coordinates";
import { getMap } from "@/lib/map/map.svelte";
import type maplibre from "maplibre-gl";

export function getFeatureJump(
	feature: Feature,
	applyPadding: boolean = false,
	map: maplibre.Map | undefined = getMap()
) {
	let center: Position | maplibre.LngLatLike | undefined = undefined;
	if (feature.geometry.type === "Point") {
		center = feature.geometry.coordinates;
	}

	let featureBbox: BBox;
	if (feature.bbox) {
		featureBbox = feature.bbox;
	} else {
		featureBbox = bbox(feature.geometry);
	}

	let zoom = 14;
	// 6-length bboxes are 3d, we can ignore those
	if (featureBbox.length === 4) {
		const options: maplibre.CameraForBoundsOptions = {};
		if (applyPadding) options.padding = 50;
		const camera = map?.cameraForBounds(featureBbox, options);
		if (camera && camera.zoom) {
			zoom = camera.zoom < 18 ? camera.zoom : 18;

			if (!center && camera.center) {
				center = camera.center;
			}
		}
	}

	if (!center) {
		center = centroid(feature).geometry.coordinates;
	}

	return {
		coords: Coords.infer(center),
		zoom
	};
}
