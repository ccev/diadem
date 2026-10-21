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
	const viewportPolygon = polygon([
		[
			[bounds.minLon, bounds.minLat],
			[bounds.minLon, bounds.maxLat],
			[bounds.maxLon, bounds.maxLat],
			[bounds.maxLon, bounds.minLat],
			[bounds.minLon, bounds.minLat]
		]
	]);

	const permittedPolygons = polygons.map((geometry) => makeFeature(geometry));
	if (permittedPolygons.length === 0) {
		return null;
	}

	/** @type {PermittedBounds['polygon']} */
	let combinedIntersection = null;
	for (const permittedPolygon of permittedPolygons) {
		const areaIntersection = intersect(featureCollection([viewportPolygon, permittedPolygon]));
		if (areaIntersection) {
			if (!combinedIntersection) {
				combinedIntersection = areaIntersection;
			} else {
				combinedIntersection = union(featureCollection([combinedIntersection, areaIntersection]));
			}
		}
	}

	if (!combinedIntersection) {
		return null;
	}

	const result = bbox(combinedIntersection);

	return {
		bounds: {
			minLon: result[0],
			minLat: result[1],
			maxLon: result[2],
			maxLat: result[3]
		},
		polygon: combinedIntersection
	};
}
