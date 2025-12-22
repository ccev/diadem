import type { Feature } from "geojson";
import { centroid } from "@turf/turf";
import { Coords } from "@/lib/utils/coordinates";

export function getFeatureJump(feature: Feature) {
	const center = centroid(feature).geometry.coordinates

	// TODO: better polygon jump algorithm

	return {
		coords: Coords.infer(center),
		zoom: 14
	}
}