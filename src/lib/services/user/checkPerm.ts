import type { Bounds } from "@/lib/mapObjects/mapBounds";
import {
	Features,
	featureImplies,
	featureWildcardAncestors,
	type FeaturesKey,
	type Perms
} from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";
import {
	bbox,
	booleanIntersects,
	booleanPointInPolygon,
	difference,
	featureCollection,
	intersect,
	feature as makeFeature,
	point,
	polygon,
	union
} from "@turf/turf";
import type { Feature, Geometry, MultiPolygon, Polygon } from "geojson";

const log = getLogger("permissions");

function isFeatureInFeatureList(featureList: FeaturesKey[] | undefined, feature: FeaturesKey) {
	if (featureList === undefined) return false;

	if (featureList.includes(Features.ALL) || featureList.includes(feature)) return true;

	const wildcards = featureWildcardAncestors[feature];
	if (wildcards !== undefined && wildcards.some((wildcard) => featureList.includes(wildcard)))
		return true;

	return featureList.some((held) => featureImplies[held]?.includes(feature));
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

export function hasAnyFeatureAnywhere(perms: Perms, features: FeaturesKey[]) {
	return features.some((feature) => hasFeatureAnywhere(perms, feature));
}

export type PermittedPolygon = Feature<Polygon | MultiPolygon> | null;

export type PermittedBounds = {
	bounds: Bounds;
	polygon: PermittedPolygon;
};

export function checkFeatureInBounds(
	perms: Perms,
	feature: FeaturesKey,
	bounds: Bounds
): PermittedBounds | null {
	return checkFeaturesInBounds(perms, [feature], bounds);
}

// Union of the permitted areas across a set of features (e.g. a whole object family), so an
// object is returned when any of them is permitted there. Per-feature stripping happens later.
export function checkFeaturesInBounds(
	perms: Perms,
	features: FeaturesKey[],
	bounds: Bounds
): PermittedBounds | null {
	if (features.some((feature) => isFeatureInFeatureList(perms.everywhere, feature))) {
		return { bounds, polygon: null };
	}

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
		if (features.some((feature) => isFeatureInFeatureList(area.features, feature))) {
			if (area.polygon) {
				permittedPolygons.push(makeFeature(area.polygon));
			}
		}
	}

	if (permittedPolygons.length === 0) {
		return null;
	}

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
		"calculated area intersections | areas: %d | features: %s | any match permissions: %s | took: %fms",
		permittedPolygons.length,
		features.join(","),
		Boolean(combinedIntersection),
		(performance.now() - start).toFixed(1)
	);

	if (!combinedIntersection) {
		return null;
	}

	const result = bbox(combinedIntersection);
	combinedIntersection.bbox = result;

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

export class FeaturePermissionContext {
	private readonly everywhere = new Set<FeaturesKey>();
	private readonly areaPolygons = new Map<FeaturesKey, Feature<Polygon>[]>();

	constructor(perms: Perms, features: FeaturesKey[]) {
		for (const feature of features) {
			if (isFeatureInFeatureList(perms.everywhere, feature)) {
				this.everywhere.add(feature);
			}
		}

		const restricted = features.filter((feature) => !this.everywhere.has(feature));
		if (restricted.length === 0) return;
		for (const area of perms.areas ?? []) {
			const granted = restricted.filter((feature) =>
				isFeatureInFeatureList(area.features, feature)
			);
			if (!area.polygon || granted.length === 0) continue;
			const polygon = makeFeature(area.polygon);
			polygon.bbox = bbox(polygon);
			for (const feature of granted) {
				const polygons = this.areaPolygons.get(feature) ?? [];
				polygons.push(polygon);
				this.areaPolygons.set(feature, polygons);
			}
		}
	}

	allowedEverywhere(feature: FeaturesKey): boolean {
		return this.everywhere.has(feature);
	}

	allowedThroughout(feature: FeaturesKey, area: PermittedPolygon): boolean {
		if (this.everywhere.has(feature)) return true;
		const polygons = this.areaPolygons.get(feature);
		if (!area || !polygons) return false;
		const [minLon, minLat, maxLon, maxLat] = bbox(area);
		let remaining: PermittedPolygon = area;
		for (const permitted of polygons) {
			const [west, south, east, north] = permitted.bbox!;
			if (east < minLon || west > maxLon || north < minLat || south > maxLat) continue;
			remaining = difference(featureCollection([remaining, permitted]));
			if (!remaining) return true;
		}
		return false;
	}

	isAllowedAt(feature: FeaturesKey, lat: number, lon: number): boolean {
		if (this.everywhere.has(feature)) return true;

		const polygons = this.areaPolygons.get(feature);
		if (!polygons) return false;

		const coordinates = [lon, lat];
		return polygons.some((poly) => booleanPointInPolygon(coordinates, poly));
	}

	isAllowedGeometry(feature: FeaturesKey, geometry: Feature<Geometry>): boolean {
		if (this.everywhere.has(feature)) return true;

		const polygons = this.areaPolygons.get(feature);
		return polygons?.some((poly) => booleanIntersects(geometry, poly)) ?? false;
	}
}
