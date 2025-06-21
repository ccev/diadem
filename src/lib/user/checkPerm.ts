import type { FeaturesKey, Perms } from "@/lib/server/auth/permissions";
import type { Bounds } from '@/lib/mapObjects/mapBounds';
import { json } from '@sveltejs/kit';
import { featureCollection, intersect, polygon, polygonize, feature as makeFeature, bbox } from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import { intersection } from 's2js/dist/s2/edge_crossings';

export const noPermResult = {
	error: "Missing permissions",
	result: []
};

function isFeatureInFeatureList(featureList: FeaturesKey[] | undefined, feature: FeaturesKey) {
	if (featureList === undefined) return false

	return featureList.includes("*") || featureList.includes(feature)
}

export function hasFeatureAnywhere(perms: Perms, feature: FeaturesKey) {
	if (isFeatureInFeatureList(perms.everywhere, feature)) return true;

	for (const area of perms.areas) {
		if (isFeatureInFeatureList(area.features, feature)) {
			return true
		}
	}
	return false
}

export function checkFeatureInBounds(perms: Perms, feature: FeaturesKey, bounds: Bounds): Bounds {
	if (isFeatureInFeatureList(perms.everywhere, feature)) return bounds

	const start = performance.now()

	const allPolygons: Feature<Polygon>[] = [
		polygon([[
			[bounds.minLon, bounds.minLat],
			[bounds.minLon, bounds.maxLat],
			[bounds.maxLon, bounds.maxLat],
			[bounds.maxLon, bounds.minLat],
			[bounds.minLon, bounds.minLat]
		]])
	]

	for (const area of perms.areas) {
		if (isFeatureInFeatureList(area.features, feature)) {
			allPolygons.push(makeFeature(area.polygon))
		}
	}

	if (allPolygons.length === 1) {
		return bounds
	}

	const intersection = intersect(featureCollection(allPolygons))

	console.debug(`CheckFeatureInBound for ${feature} with ${allPolygons.length} polygons took ${performance.now() - start} ms`)

	if (!intersection) return bounds

	const result = bbox(intersection)

	return {
		minLon: result[0],
		minLat: result[1],
		maxLon: result[2],
		maxLat: result[3]
	}
}
