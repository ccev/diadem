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
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { Features, type FeaturesKey, type PermArea, type Perms } from "@/lib/utils/features";
import { MAP_OBJECT_SUB_FEATURES } from "@/lib/permissions/subFeatures";
import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
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

export function hasAnySubFeatureAnywhere(perms: Perms, type: MapObjectType): boolean {
	const subs = MAP_OBJECT_SUB_FEATURES[type];
	if (!subs) return false;
	return subs.some((f) => hasFeatureAnywhere(perms, f));
}

export type PermittedPolygon = Feature<Polygon | MultiPolygon> | null;

export type PermittedBounds = {
	bounds: Bounds;
	polygon: PermittedPolygon;
};

function checkBoundsByPredicate(
	perms: Perms,
	bounds: Bounds,
	matchEverywhere: () => boolean,
	matchArea: (area: PermArea) => boolean,
	logCtx: string
): PermittedBounds | null {
	if (matchEverywhere()) return { bounds, polygon: null };

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
		if (!area.polygon) continue;
		if (matchArea(area)) {
			permittedPolygons.push(makeFeature(area.polygon));
		}
	}

	if (permittedPolygons.length === 0) return null;

	let combinedIntersection: PermittedPolygon = null;
	for (const permittedPolygon of permittedPolygons) {
		const areaIntersection = intersect(featureCollection([viewportPolygon, permittedPolygon]));
		if (areaIntersection) {
			if (!combinedIntersection) {
				combinedIntersection = areaIntersection as Feature<Polygon | MultiPolygon>;
			} else {
				combinedIntersection = union(
					featureCollection([
						combinedIntersection,
						areaIntersection as Feature<Polygon | MultiPolygon>
					])
				) as PermittedPolygon;
			}
		}
	}

	log.debug(
		"calculated area intersections | %s | areas: %d | match: %s | took: %fms",
		logCtx,
		permittedPolygons.length,
		Boolean(combinedIntersection),
		(performance.now() - start).toFixed(1)
	);

	if (!combinedIntersection) return null;

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

export function checkFeatureInBounds(
	perms: Perms,
	feature: FeaturesKey,
	bounds: Bounds
): PermittedBounds | null {
	return checkBoundsByPredicate(
		perms,
		bounds,
		() => isFeatureInFeatureList(perms.everywhere, feature),
		(area) => isFeatureInFeatureList(area.features, feature),
		`feature: ${feature}`
	);
}

export function checkAnySubFeatureInBounds(
	perms: Perms,
	type: MapObjectType,
	bounds: Bounds
): PermittedBounds | null {
	const subs = MAP_OBJECT_SUB_FEATURES[type];
	if (!subs) return null;

	return checkBoundsByPredicate(
		perms,
		bounds,
		() => subs.some((f) => isFeatureInFeatureList(perms.everywhere, f)),
		(area) => subs.some((f) => isFeatureInFeatureList(area.features, f)),
		`type: ${type}`
	);
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

export type PointFeatureChecker = (feature: FeaturesKey) => boolean;

// Returns a memoised `has(feature)` for one (lat,lon). Same feature checked
// twice on the same row reuses the result instead of walking perms.areas
// again. When `perms` is undefined (caller has no perm context), every
// check resolves to true.
export function makePointFeatureChecker(
	perms: Perms | undefined,
	lat: number,
	lon: number
): PointFeatureChecker {
	if (!perms) return () => true;
	const cache = new Map<FeaturesKey, boolean>();
	return (feature) => {
		const cached = cache.get(feature);
		if (cached !== undefined) return cached;
		const allowed = isPointInAllowedArea(perms, feature, lat, lon);
		cache.set(feature, allowed);
		return allowed;
	};
}
