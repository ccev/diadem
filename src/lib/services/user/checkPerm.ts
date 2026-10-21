import { intersectPermissionBounds } from "@/lib/geometry/permissionBounds.mjs";
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
	booleanIntersects,
	booleanPointInPolygon,
	feature as makeFeature,
	point
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

// null grants at least one requested feature everywhere; [] means no eligible areas.
export function getPermissionPolygons(perms: Perms, features: FeaturesKey[]): Polygon[] | null {
	if (features.some((feature) => isFeatureInFeatureList(perms.everywhere, feature))) {
		return null;
	}

	const polygons: Polygon[] = [];
	for (const area of perms.areas) {
		if (features.some((feature) => isFeatureInFeatureList(area.features, feature))) {
			if (area.polygon) {
				polygons.push(area.polygon);
			}
		}
	}
	return polygons;
}

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
	const permittedPolygons = getPermissionPolygons(perms, features);
	if (permittedPolygons === null) {
		return { bounds, polygon: null };
	}

	const start = performance.now();

	if (permittedPolygons.length === 0) {
		return null;
	}

	const result = intersectPermissionBounds(permittedPolygons, bounds);

	log.debug(
		"calculated area intersections | areas: %d | features: %s | any match permissions: %s | took: %fms",
		permittedPolygons.length,
		features.join(","),
		Boolean(result?.polygon),
		(performance.now() - start).toFixed(1)
	);

	return result;
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

// Precomputes, for a fixed set of features, whether each is granted everywhere and the polygons
// granting it, so the query layer can strip per object: "everywhere" needs no geometry, otherwise
// a point-in-polygon test.
export class FeaturePermissionContext {
	private readonly everywhere = new Set<FeaturesKey>();
	private readonly areaPolygons = new Map<FeaturesKey, Feature<Polygon>[]>();

	constructor(perms: Perms, features: FeaturesKey[]) {
		for (const feature of features) {
			if (isFeatureInFeatureList(perms.everywhere, feature)) {
				this.everywhere.add(feature);
				continue;
			}

			const polygons: Feature<Polygon>[] = [];
			for (const area of perms.areas ?? []) {
				if (isFeatureInFeatureList(area.features, feature) && area.polygon) {
					polygons.push(makeFeature(area.polygon));
				}
			}
			if (polygons.length > 0) {
				this.areaPolygons.set(feature, polygons);
			}
		}
	}

	allowedEverywhere(feature: FeaturesKey): boolean {
		return this.everywhere.has(feature);
	}

	isAllowedAt(feature: FeaturesKey, lat: number, lon: number): boolean {
		if (this.everywhere.has(feature)) return true;

		const polygons = this.areaPolygons.get(feature);
		if (!polygons) return false;

		const turfPoint = point([lon, lat]);
		return polygons.some((poly) => booleanPointInPolygon(turfPoint, poly));
	}

	isAllowedGeometry(feature: FeaturesKey, geometry: Feature<Geometry>): boolean {
		if (this.everywhere.has(feature)) return true;

		const polygons = this.areaPolygons.get(feature);
		return polygons?.some((poly) => booleanIntersects(geometry, poly)) ?? false;
	}
}
