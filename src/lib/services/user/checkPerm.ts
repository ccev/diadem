import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { bbox, feature as makeFeature, featureCollection, intersect, polygon, union } from "@turf/turf";
import type { Feature, Polygon } from "geojson";
import { Features, type FeaturesKey, type Perms } from "@/lib/utils/features";
import { getUniversalLogger, isDebugEnabled } from "@/lib/utils/logger";

const log = getUniversalLogger("checkPerm");

function debugLog(message: string, ...args: unknown[]) {
	if (isDebugEnabled("permissions")) {
		log.debug(message, ...args);
	}
}

function isFeatureInFeatureList(featureList: FeaturesKey[] | undefined, feature: FeaturesKey) {
	if (featureList === undefined) return false;

	return featureList.includes(Features.ALL) || featureList.includes(feature);
}

export function hasFeatureAnywhere(perms: Perms, feature: FeaturesKey) {
	if (isFeatureInFeatureList(perms.everywhere, feature)) return true;

	for (const area of perms.areas ?? []) {
		if (isFeatureInFeatureList(area.features, feature)) {
			return true;
		}
	}
	return false;
}

export function checkFeatureInBounds(perms: Perms, feature: FeaturesKey, bounds: Bounds): Bounds {
	if (isFeatureInFeatureList(perms.everywhere, feature)) return bounds;

	const start = performance.now();

	const allPolygons: Feature<Polygon>[] = [
		polygon([
			[
				[bounds.minLon, bounds.minLat],
				[bounds.minLon, bounds.maxLat],
				[bounds.maxLon, bounds.maxLat],
				[bounds.maxLon, bounds.minLat],
				[bounds.minLon, bounds.minLat]
			]
		])
	];

	for (const area of perms.areas) {
		if (isFeatureInFeatureList(area.features, feature)) {
			allPolygons.push(makeFeature(area.polygon));
		}
	}

	if (allPolygons.length === 1) {
		return bounds;
	}

	const intersection = intersect(featureCollection(allPolygons));

	console.debug(
		`CheckFeatureInBound for ${feature} with ${allPolygons.length} polygons took ${performance.now() - start} ms`
	);

	if (!intersection) return bounds;

	const result = bbox(intersection);

	return {
		minLon: result[0],
		minLat: result[1],
		maxLon: result[2],
		maxLat: result[3]
	};
}
