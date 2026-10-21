import { intersectPermissionBounds } from "@/lib/geometry/permissionBounds.mjs";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import {
	checkFeatureInBounds,
	checkFeaturesInBounds,
	FeaturePermissionContext,
	getPermissionPolygons
} from "@/lib/services/user/checkPerm";
import { featureFamily, Features, type Perms } from "@/lib/utils/features";
import { bboxPolygon, booleanPointInPolygon, lineString, multiPolygon, polygon } from "@turf/turf";
import type { Polygon } from "geojson";
import { describe, expect, it } from "vitest";

const permissions = {
	everywhere: [],
	areas: [
		{
			name: "test area",
			features: [Features.ROUTE],
			polygon: {
				type: "Polygon" as const,
				coordinates: [
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0]
					]
				]
			}
		}
	]
};

describe("FeaturePermissionContext geometry", () => {
	it("allows a route crossing an area when both endpoints are outside", () => {
		const context = new FeaturePermissionContext(permissions, [Features.ROUTE]);

		expect(
			context.isAllowedGeometry(
				Features.ROUTE,
				lineString([
					[-1, 0.5],
					[2, 0.5]
				])
			)
		).toBe(true);
		expect(context.isAllowedAt(Features.ROUTE, 0.5, -1)).toBe(false);
		expect(context.isAllowedAt(Features.ROUTE, 0.5, 2)).toBe(false);
	});

	it("rejects a route outside the area", () => {
		const context = new FeaturePermissionContext(permissions, [Features.ROUTE]);

		expect(
			context.isAllowedGeometry(
				Features.ROUTE,
				lineString([
					[-1, 2],
					[2, 2]
				])
			)
		).toBe(false);
	});
});

describe("permission polygon selection", () => {
	const bounds = { minLon: 0, minLat: 0, maxLon: 6, maxLat: 6 };

	it("prefilters distant areas without trusting stale bboxes or excluding touching boundaries", () => {
		const near = bboxPolygon([1, 1, 2, 2]).geometry;
		near.bbox = [20, 20, 21, 21];
		const touching = bboxPolygon([6, 1, 7, 2]).geometry;
		const far = bboxPolygon([20, 20, 21, 21]).geometry;
		const perms: Perms = {
			everywhere: [],
			areas: [far, near, touching].map((polygon, index) => ({
				name: String(index),
				features: [Features.GYM],
				polygon
			}))
		};
		expect(getPermissionPolygons(perms, [Features.GYM], bounds)).toEqual([near, touching]);
		expect(checkFeaturesInBounds(perms, [Features.GYM], bounds)).toEqual(
			intersectPermissionBounds([near, touching], bounds)
		);
		// Permissions can be refreshed in place; no cached bbox may survive a coordinate change.
		far.coordinates = bboxPolygon([3, 3, 4, 4]).geometry.coordinates;
		expect(getPermissionPolygons(perms, [Features.GYM], bounds)).toEqual([far, near, touching]);
	});

	it.each([
		Features.ALL,
		Features.MAP_OBJECT_ALL,
		Features.POKEMON_ALL,
		Features.POKEMON_PVP,
		Features.POKEMON_IV
	])("keeps the everywhere fast path for %s granting IV", (held) => {
		const perms: Perms = {
			everywhere: [held],
			get areas(): Perms["areas"] {
				throw new Error("Everywhere grants must not read area geometry");
			}
		};

		expect(getPermissionPolygons(perms, [Features.POKEMON_IV])).toBeNull();
		const result = checkFeaturesInBounds(perms, [Features.POKEMON_IV], bounds);
		expect(result).toEqual({ bounds, polygon: null });
		expect(result?.bounds).toBe(bounds);
	});

	it.each([
		Features.ALL,
		Features.MAP_OBJECT_ALL,
		Features.POKEMON_ALL,
		Features.POKEMON_PVP,
		Features.POKEMON_IV
	])("selects polygon geometries for %s granting IV", (held) => {
		const geometry = bboxPolygon([1, 1, 2, 2]).geometry;
		const perms: Perms = {
			everywhere: [Features.ROUTE],
			areas: [...permissions.areas, { name: "IV area", features: [held], polygon: geometry }]
		};

		const selected = getPermissionPolygons(perms, [Features.POKEMON_IV]);
		expect(selected).toEqual([geometry]);
		expect(selected?.[0]).toBe(geometry);
		expect(checkFeatureInBounds(perms, Features.POKEMON_IV, bounds)).toEqual(
			intersectPermissionBounds([geometry], bounds)
		);
	});

	it("does not reverse implications or treat unrelated grants as eligible", () => {
		const perms: Perms = {
			everywhere: [Features.POKEMON_IV],
			areas: [{ ...permissions.areas[0], features: [Features.POKEMON_IV] }]
		};

		expect(getPermissionPolygons(perms, [Features.POKEMON_PVP])).toEqual([]);
		expect(checkFeaturesInBounds(perms, [Features.POKEMON_PVP], bounds)).toBeNull();
		expect(getPermissionPolygons(permissions, [Features.POKEMON])).toEqual([]);
		expect(checkFeaturesInBounds(permissions, [Features.POKEMON], bounds)).toBeNull();
		expect(getPermissionPolygons({ everywhere: [Features.ALL], areas: [] }, [])).toEqual([]);
		expect(getPermissionPolygons({ everywhere: [], areas: [] }, [Features.ROUTE])).toEqual([]);
	});

	it("selects each area once in permission order across a whole feature family", () => {
		const left = bboxPolygon([0, 0, 1, 1]).geometry;
		const right = bboxPolygon([2, 0, 3, 1]).geometry;
		const both = bboxPolygon([4, 0, 5, 1]).geometry;
		const perms: Perms = {
			everywhere: [],
			areas: [
				{ name: "lures", features: [Features.LURE], polygon: right },
				{ name: "quests", features: [Features.QUEST], polygon: left },
				{
					name: "unrelated",
					features: [Features.GYM],
					polygon: bboxPolygon([0, 0, 6, 6]).geometry
				},
				{ name: "both", features: [Features.QUEST, Features.LURE], polygon: both }
			]
		};
		const family = featureFamily[Features.POKESTOP];

		expect(getPermissionPolygons(perms, family)).toEqual([right, left, both]);
		expect(checkFeaturesInBounds(perms, family, bounds)).toEqual(
			intersectPermissionBounds([right, left, both], bounds)
		);
		expect(checkFeatureInBounds(perms, Features.QUEST, bounds)).toEqual(
			intersectPermissionBounds([left, both], bounds)
		);
		expect(getPermissionPolygons({ ...perms, everywhere: [Features.INVASION] }, family)).toBeNull();
	});
});

describe.each([
	{ name: "pure permission geometry", calculate: intersectPermissionBounds },
	{
		name: "synchronous permission geometry",
		calculate: (polygons: Polygon[], bounds: Bounds) =>
			checkFeaturesInBounds(
				{
					everywhere: [],
					areas: polygons.map((polygon, index) => ({
						name: `area ${index}`,
						features: [Features.ROUTE],
						polygon
					}))
				},
				[Features.ROUTE],
				bounds
			)
	}
])("$name", ({ calculate }) => {
	const bounds = { minLon: 0, minLat: 0, maxLon: 6, maxLat: 6 };
	const withHole = polygon([
		bboxPolygon([0, 0, 6, 6]).geometry.coordinates[0],
		bboxPolygon([2, 2, 4, 4]).geometry.coordinates[0].toReversed()
	]);

	it("returns null for no eligible polygons", () => {
		expect(calculate([], bounds)).toBeNull();
	});

	it.each([
		{ name: "outside", geometry: bboxPolygon([7, 0, 8, 1]).geometry },
		{ name: "edge contact", geometry: bboxPolygon([6, 0, 7, 1]).geometry },
		{ name: "vertex contact", geometry: bboxPolygon([6, 6, 7, 7]).geometry }
	])("returns null for $name without an area intersection", ({ geometry }) => {
		expect(calculate([geometry], bounds)).toBeNull();
	});

	it("rejects a nonintersecting polygon even when its bbox overlaps", () => {
		const triangle = polygon([
			[
				[0, 0],
				[6, 0],
				[0, 6],
				[0, 0]
			]
		]).geometry;

		expect(calculate([triangle], { minLon: 4, minLat: 4, maxLon: 5, maxLat: 5 })).toBeNull();
	});

	it("clips to the viewport and returns the intersection bbox", () => {
		expect(calculate([bboxPolygon([-2, 1, 3, 8]).geometry], bounds)).toEqual({
			bounds: { minLon: 0, minLat: 1, maxLon: 3, maxLat: 6 },
			polygon: polygon(bboxPolygon([0, 1, 3, 6]).geometry.coordinates)
		});
	});

	it("retains disjoint pieces without granting the gap inside their bbox", () => {
		const left = bboxPolygon([0, 0, 1, 1]).geometry;
		const right = bboxPolygon([3, 2, 4, 3]).geometry;
		const result = calculate([right, left], bounds);

		expect(result).toEqual({
			bounds: { minLon: 0, minLat: 0, maxLon: 4, maxLat: 3 },
			polygon: multiPolygon([left.coordinates, right.coordinates])
		});
		expect(booleanPointInPolygon([2, 1.5], result!.polygon!)).toBe(false);
	});

	it("incrementally unions overlapping areas without filling concave gaps", () => {
		const result = calculate(
			[
				bboxPolygon([0, 0, 3, 2]).geometry,
				bboxPolygon([2, 0, 4, 3]).geometry,
				bboxPolygon([3, 2, 5, 4]).geometry
			],
			bounds
		);

		expect(result).toEqual({
			bounds: { minLon: 0, minLat: 0, maxLon: 5, maxLat: 4 },
			polygon: polygon([
				[
					[0, 0],
					[4, 0],
					[4, 2],
					[5, 2],
					[5, 4],
					[3, 4],
					[3, 3],
					[2, 3],
					[2, 2],
					[0, 2],
					[0, 0]
				]
			])
		});
	});

	it("preserves holes and rejects a viewport entirely inside a hole", () => {
		const result = calculate([withHole.geometry], bounds);

		expect(result).toEqual({ bounds, polygon: withHole });
		expect(booleanPointInPolygon([1, 1], result!.polygon!)).toBe(true);
		expect(booleanPointInPolygon([3, 3], result!.polygon!)).toBe(false);
		expect(
			calculate([withHole.geometry], { minLon: 2.5, minLat: 2.5, maxLon: 3.5, maxLat: 3.5 })
		).toBeNull();
	});

	it("fills only the portion of a hole granted by another polygon", () => {
		const result = calculate([withHole.geometry, bboxPolygon([2, 2, 3, 4]).geometry], bounds);

		expect(result).toEqual({
			bounds,
			polygon: polygon([
				withHole.geometry.coordinates[0],
				bboxPolygon([3, 2, 4, 4]).geometry.coordinates[0].toReversed()
			])
		});
		expect(booleanPointInPolygon([2.5, 3], result!.polygon!)).toBe(true);
		expect(booleanPointInPolygon([3.5, 3], result!.polygon!)).toBe(false);
	});

	it("does not mutate the input polygons, coordinate arrays, or bounds", () => {
		const polygons = [structuredClone(withHole.geometry), bboxPolygon([-1, 2, 3, 4]).geometry];
		const viewport = { ...bounds };
		const before = structuredClone({ polygons, bounds: viewport });
		for (const geometry of polygons) {
			for (const ring of geometry.coordinates) {
				for (const position of ring) Object.freeze(position);
				Object.freeze(ring);
			}
			Object.freeze(geometry.coordinates);
			Object.freeze(geometry);
		}
		Object.freeze(polygons);
		Object.freeze(viewport);

		expect(calculate(polygons, viewport)).not.toBeNull();
		expect({ polygons, bounds: viewport }).toEqual(before);
	});
});
