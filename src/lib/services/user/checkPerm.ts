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

export function checkFeatureInBounds(perms: Perms, feature: FeaturesKey, bounds: Bounds): Bounds | null {
	if (isFeatureInFeatureList(perms.everywhere, feature)) return bounds;

	const start = performance.now();

	const viewportPolygon = polygon([
		[
			[bounds.minLon, bounds.minLat],
			[bounds.minLon, bounds.maxLat],
			[bounds.maxLon, bounds.maxLat],
			[bounds.maxLon, bounds.minLat],
			[bounds.minLon, bounds.minLat]
		]
	]);

	// Collect all permitted area polygons that have this feature
	const permittedAreaPolygons: Feature<Polygon>[] = [];
	const permittedAreaNames: string[] = [];
	for (const area of perms.areas) {
		if (isFeatureInFeatureList(area.features, feature)) {
			if (area.polygon) {
				permittedAreaPolygons.push(makeFeature(area.polygon));
				permittedAreaNames.push(area.name);
			} else {
				log.warning(`Area "${area.name}" has feature "${feature}" but no polygon defined`);
			}
		}
	}

	debugLog(
		`feature=${feature}, permittedAreas=[${permittedAreaNames.join(", ")}], viewport=[${bounds.minLat.toFixed(4)},${bounds.minLon.toFixed(4)} to ${bounds.maxLat.toFixed(4)},${bounds.maxLon.toFixed(4)}]`
	);

	// If no permitted areas have this feature (or none have polygons), deny access
	if (permittedAreaPolygons.length === 0) {
		log.warning(`No permitted area polygons for feature "${feature}" - denying access`);
		return null;
	}

	// Find intersection of viewport with each permitted area and collect results
	// (The old code incorrectly tried to intersect ALL polygons at once, which finds the common area of ALL,
	// not the union of intersections with each permitted area)
	let combinedIntersection: Feature<Polygon> | null = null;
	for (let i = 0; i < permittedAreaPolygons.length; i++) {
		const areaIntersection = intersect(featureCollection([viewportPolygon, permittedAreaPolygons[i]]));
		if (areaIntersection) {
			debugLog(`Viewport intersects with "${permittedAreaNames[i]}"`);
			if (!combinedIntersection) {
				combinedIntersection = areaIntersection as Feature<Polygon>;
			} else {
				// Union with previous intersections
				combinedIntersection = union(featureCollection([combinedIntersection, areaIntersection as Feature<Polygon>])) as Feature<Polygon> | null;
			}
		}
	}

	debugLog(
		`Checked ${feature} with ${permittedAreaPolygons.length} permitted areas in ${(performance.now() - start).toFixed(1)}ms`
	);

	// If no intersection with any permitted area, deny access
	if (!combinedIntersection) {
		log.warning(`Viewport does not intersect any permitted area for feature "${feature}" - denying access`);
		return null;
	}

	const result = bbox(combinedIntersection);

	debugLog(
		`Restricted bounds: [${result[1].toFixed(4)},${result[0].toFixed(4)} to ${result[3].toFixed(4)},${result[2].toFixed(4)}]`
	);

	return {
		minLon: result[0],
		minLat: result[1],
		maxLon: result[2],
		maxLat: result[3]
	};
}
