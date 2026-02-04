import type { Bounds } from "@/lib/mapObjects/mapBounds";
import {
	bbox,
	booleanPointInPolygon,
	feature as makeFeature,
	featureCollection,
	intersect,
	point,
	polygon,
	union
} from "@turf/turf";
import type { Feature, Polygon } from "geojson";
import { Features, type FeaturesKey, type Perms } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("permissions");

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

export function checkFeatureInBounds(
	perms: Perms,
	feature: FeaturesKey,
	bounds: Bounds
): Bounds | null {
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

	const permittedPolygons: Feature<Polygon>[] = [];
	for (const area of perms.areas) {
		if (isFeatureInFeatureList(area.features, feature)) {
			if (area.polygon) {
				permittedPolygons.push(makeFeature(area.polygon));
			}
		}
	}

	// If no permitted areas have this feature (or none have polygons), deny access
	if (permittedPolygons.length === 0) {
		return null;
	}

	// Find intersection of viewport with each permitted area and collect results
	let combinedIntersection: Feature<Polygon> | null = null;
	for (const permittedPolygon of permittedPolygons) {
		const areaIntersection = intersect(
			featureCollection([viewportPolygon, permittedPolygon])
		);
		if (areaIntersection) {
			if (!combinedIntersection) {
				combinedIntersection = areaIntersection as Feature<Polygon>;
			} else {
				combinedIntersection = union(
					featureCollection([combinedIntersection, areaIntersection as Feature<Polygon>])
				) as Feature<Polygon> | null;
			}
		}
	}

	log.debug(
		"calculated area intersections | areas: %d | feature: %s | any match permissions: %s | took: %fms",
		permittedPolygons.length,
		feature,
		Boolean(combinedIntersection),
		(performance.now() - start).toFixed(1)
	);

	// If no intersection with any permitted area, deny access
	if (!combinedIntersection) {
		return null;
	}

	const result = bbox(combinedIntersection);

	return {
		minLon: result[0],
		minLat: result[1],
		maxLon: result[2],
		maxLat: result[3]
	};
}

export function isPointInAllowedArea(
	perms: Perms,
	feature: FeaturesKey,
	lat: number,
	lon: number
): boolean {
	if (isFeatureInFeatureList(perms.everywhere, feature)) {
		return true;
	}

	const start = performance.now();
	const turfPoint = point([lon, lat]);

	const isAllowed = perms.areas.some((area) => {
		if (isFeatureInFeatureList(area.features, feature) && area.polygon) {
			const poly = makeFeature(area.polygon);
			return booleanPointInPolygon(turfPoint, poly);
		}
		return false;
	});

	log.debug(
		"checked point permission | feature: %s | coords: %f,%f | allowed: %s | took: %fms",
		feature,
		lat,
		lon,
		isAllowed,
		(performance.now() - start).toFixed(1)
	);

	return isAllowed;
}
