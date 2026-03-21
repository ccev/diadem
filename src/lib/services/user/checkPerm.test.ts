import { describe, it, expect } from "vitest";
import { hasFeatureAnywhere, checkFeatureInBounds, isPointInAllowedArea } from "./checkPerm";
import { Features, type Perms, type PermArea } from "@/lib/utils/features";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { Polygon } from "geojson";
import type { Bounds } from "@/lib/mapObjects/mapBounds";

// A simple square polygon around (0,0) — roughly ±1 degree
function makeSquarePolygon(
	minLon: number,
	minLat: number,
	maxLon: number,
	maxLat: number
): Polygon {
	return {
		type: "Polygon",
		coordinates: [
			[
				[minLon, minLat],
				[minLon, maxLat],
				[maxLon, maxLat],
				[maxLon, minLat],
				[minLon, minLat]
			]
		]
	};
}

function makeArea(name: string, features: any[], polygon: Polygon): PermArea {
	return { name, features, polygon };
}

function makeBounds(minLon: number, minLat: number, maxLon: number, maxLat: number): Bounds {
	return { minLon, minLat, maxLon, maxLat };
}

describe("hasFeatureAnywhere", () => {
	it("returns true when feature is in everywhere list", () => {
		const perms: Perms = { everywhere: [MapObjectType.POKEMON], areas: [] };
		expect(hasFeatureAnywhere(perms, MapObjectType.POKEMON)).toBe(true);
	});

	it("returns false when feature is not in everywhere list", () => {
		const perms: Perms = { everywhere: [MapObjectType.GYM], areas: [] };
		expect(hasFeatureAnywhere(perms, MapObjectType.POKEMON)).toBe(false);
	});

	it("returns true when wildcard * is in everywhere list", () => {
		const perms: Perms = { everywhere: [Features.ALL as any], areas: [] };
		expect(hasFeatureAnywhere(perms, MapObjectType.POKEMON)).toBe(true);
	});

	it("returns true when feature is in an area", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [makeArea("area1", [MapObjectType.POKEMON], makeSquarePolygon(-1, -1, 1, 1))]
		};
		expect(hasFeatureAnywhere(perms, MapObjectType.POKEMON)).toBe(true);
	});

	it("returns false when feature not in any area", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [makeArea("area1", [MapObjectType.GYM], makeSquarePolygon(-1, -1, 1, 1))]
		};
		expect(hasFeatureAnywhere(perms, MapObjectType.POKEMON)).toBe(false);
	});

	it("returns true when area has wildcard", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [makeArea("area1", [Features.ALL as any], makeSquarePolygon(-1, -1, 1, 1))]
		};
		expect(hasFeatureAnywhere(perms, MapObjectType.POKEMON)).toBe(true);
	});

	it("returns false when everywhere is undefined", () => {
		const perms: Perms = { everywhere: undefined as any, areas: [] };
		expect(hasFeatureAnywhere(perms, MapObjectType.POKEMON)).toBe(false);
	});

	it("returns false when no areas", () => {
		const perms: Perms = { everywhere: [], areas: [] };
		expect(hasFeatureAnywhere(perms, MapObjectType.POKEMON)).toBe(false);
	});
});

describe("checkFeatureInBounds", () => {
	const viewBounds = makeBounds(-2, -2, 2, 2);

	it("returns full bounds when feature is in everywhere list", () => {
		const perms: Perms = { everywhere: [MapObjectType.POKEMON], areas: [] };
		const result = checkFeatureInBounds(perms, MapObjectType.POKEMON, viewBounds);
		expect(result).toEqual(viewBounds);
	});

	it("returns null when no permission for feature", () => {
		const perms: Perms = { everywhere: [], areas: [] };
		const result = checkFeatureInBounds(perms, MapObjectType.POKEMON, viewBounds);
		expect(result).toBeNull();
	});

	it("returns intersected bounds when area partially overlaps viewport", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [
				makeArea("area1", [MapObjectType.POKEMON], makeSquarePolygon(-1, -1, 1, 1))
			]
		};
		const result = checkFeatureInBounds(perms, MapObjectType.POKEMON, viewBounds);
		expect(result).not.toBeNull();
		// The intersection should be the smaller polygon bounds
		expect(result!.minLon).toBeCloseTo(-1, 5);
		expect(result!.minLat).toBeCloseTo(-1, 5);
		expect(result!.maxLon).toBeCloseTo(1, 5);
		expect(result!.maxLat).toBeCloseTo(1, 5);
	});

	it("returns null when area doesn't overlap viewport at all", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [
				makeArea("area1", [MapObjectType.POKEMON], makeSquarePolygon(10, 10, 11, 11))
			]
		};
		const result = checkFeatureInBounds(perms, MapObjectType.POKEMON, viewBounds);
		expect(result).toBeNull();
	});

	it("returns null when area has feature but no polygon", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [{ name: "area1", features: [MapObjectType.POKEMON], polygon: undefined as any }]
		};
		const result = checkFeatureInBounds(perms, MapObjectType.POKEMON, viewBounds);
		expect(result).toBeNull();
	});

	it("returns null when area has polygon but wrong feature", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [
				makeArea("area1", [MapObjectType.GYM], makeSquarePolygon(-1, -1, 1, 1))
			]
		};
		const result = checkFeatureInBounds(perms, MapObjectType.POKEMON, viewBounds);
		expect(result).toBeNull();
	});

	it("combines multiple overlapping areas", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [
				makeArea("area1", [MapObjectType.POKEMON], makeSquarePolygon(-1, -1, 0, 0)),
				makeArea("area2", [MapObjectType.POKEMON], makeSquarePolygon(0, 0, 1, 1))
			]
		};
		const result = checkFeatureInBounds(perms, MapObjectType.POKEMON, viewBounds);
		expect(result).not.toBeNull();
		// Combined bounding box should span both areas
		expect(result!.minLon).toBeCloseTo(-1, 5);
		expect(result!.minLat).toBeCloseTo(-1, 5);
		expect(result!.maxLon).toBeCloseTo(1, 5);
		expect(result!.maxLat).toBeCloseTo(1, 5);
	});
});

describe("isPointInAllowedArea", () => {
	it("returns true when feature is in everywhere list", () => {
		const perms: Perms = { everywhere: [MapObjectType.POKEMON], areas: [] };
		expect(isPointInAllowedArea(perms, MapObjectType.POKEMON, 0, 0)).toBe(true);
	});

	it("returns true when point is inside allowed polygon", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [
				makeArea("area1", [MapObjectType.POKEMON], makeSquarePolygon(-1, -1, 1, 1))
			]
		};
		expect(isPointInAllowedArea(perms, MapObjectType.POKEMON, 0, 0)).toBe(true);
	});

	it("returns false when point is outside allowed polygon", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [
				makeArea("area1", [MapObjectType.POKEMON], makeSquarePolygon(-1, -1, 1, 1))
			]
		};
		expect(isPointInAllowedArea(perms, MapObjectType.POKEMON, 5, 5)).toBe(false);
	});

	it("returns false when area has wrong feature", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [
				makeArea("area1", [MapObjectType.GYM], makeSquarePolygon(-1, -1, 1, 1))
			]
		};
		expect(isPointInAllowedArea(perms, MapObjectType.POKEMON, 0, 0)).toBe(false);
	});

	it("returns false when area has no polygon", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [{ name: "area1", features: [MapObjectType.POKEMON], polygon: undefined as any }]
		};
		expect(isPointInAllowedArea(perms, MapObjectType.POKEMON, 0, 0)).toBe(false);
	});

	it("returns false when no areas and not in everywhere", () => {
		const perms: Perms = { everywhere: [], areas: [] };
		expect(isPointInAllowedArea(perms, MapObjectType.POKEMON, 0, 0)).toBe(false);
	});

	it("returns true when point is in any of multiple areas", () => {
		const perms: Perms = {
			everywhere: [],
			areas: [
				makeArea("area1", [MapObjectType.POKEMON], makeSquarePolygon(10, 10, 11, 11)),
				makeArea("area2", [MapObjectType.POKEMON], makeSquarePolygon(-1, -1, 1, 1))
			]
		};
		expect(isPointInAllowedArea(perms, MapObjectType.POKEMON, 0, 0)).toBe(true);
	});

	it("returns true with wildcard feature in everywhere", () => {
		const perms: Perms = { everywhere: [Features.ALL as any], areas: [] };
		expect(isPointInAllowedArea(perms, MapObjectType.POKEMON, 99, 99)).toBe(true);
	});
});
