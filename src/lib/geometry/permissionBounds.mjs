import {
	bbox,
	featureCollection,
	intersect,
	feature as makeFeature,
	polygon,
	union
} from "@turf/turf";

/** @typedef {import('geojson').Polygon} Polygon */
/** @typedef {import('../services/user/checkPerm').PermittedBounds} PermittedBounds */

/**
 * @param {Polygon[]} polygons
 * @param {PermittedBounds['bounds']} bounds
 * @returns {PermittedBounds | null}
 */
export function intersectPermissionBounds(polygons, bounds) {
	if (polygons.length === 0) return null;

	const viewportPolygon = polygon([
		[
			[bounds.minLon, bounds.minLat],
			[bounds.minLon, bounds.maxLat],
			[bounds.maxLon, bounds.maxLat],
			[bounds.maxLon, bounds.minLat],
			[bounds.minLon, bounds.minLat]
		]
	]);

	/** @type {PermittedBounds['polygon']} */
	let combinedIntersection = null;
	for (const geometry of polygons) {
		const areaIntersection = intersect(featureCollection([viewportPolygon, makeFeature(geometry)]));
		if (!areaIntersection) continue;
		combinedIntersection = combinedIntersection
			? union(featureCollection([combinedIntersection, areaIntersection]))
			: areaIntersection;
	}

	if (!combinedIntersection) {
		return null;
	}

	const [minLon, minLat, maxLon, maxLat] = bbox(combinedIntersection);

	return {
		bounds: { minLon, minLat, maxLon, maxLat },
		polygon: combinedIntersection
	};
}
