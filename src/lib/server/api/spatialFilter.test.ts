import { buildSpatialFilter } from "@/lib/server/api/spatialFilter";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { describe, expect, it } from "vitest";

const bounds = { minLat: 53, maxLat: 54, minLon: 10, maxLon: 13 };
const ring = [
	[10, 53],
	[11, 53],
	[11, 54],
	[10, 54],
	[10, 53]
];
const polygon: Polygon = { type: "Polygon", coordinates: [ring] };
const polygonWithHole: Polygon = {
	type: "Polygon",
	coordinates: [
		ring,
		[
			[10.2, 53.2],
			[10.2, 53.8],
			[10.8, 53.8],
			[10.8, 53.2],
			[10.2, 53.2]
		]
	]
};
const multiPolygon: MultiPolygon = {
	type: "MultiPolygon",
	coordinates: [[ring], [ring.map(([lon, lat]) => [lon + 2, lat])]]
};

describe("buildSpatialFilter", () => {
	it("keeps the existing bounds-only predicate without an area restriction", () => {
		expect(buildSpatialFilter(null, bounds)).toEqual({
			sql: "lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?",
			values: [53, 54, 10, 13]
		});
	});

	it.each([
		["polygon", polygon],
		["polygon with a hole", polygonWithHole],
		["multipolygon", multiPolygon]
	] as const)("combines indexed bounds with exact containment for a %s", (_name, geometry) => {
		const permitted: Feature<Polygon | MultiPolygon> = {
			type: "Feature",
			properties: { name: "Allowed area" },
			geometry
		};

		expect(buildSpatialFilter(permitted, bounds)).toEqual({
			sql: "lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND ST_Contains(ST_GeomFromGeoJSON(?), Point(lon, lat))",
			values: [53, 54, 10, 13, JSON.stringify(geometry)]
		});
	});

	it("preserves the qualified point expression for joined queries", () => {
		const permitted: Feature<Polygon> = { type: "Feature", properties: {}, geometry: polygon };

		expect(buildSpatialFilter(permitted, bounds, "Point(pokestop.lon, pokestop.lat)")).toEqual({
			sql: "lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND ST_Contains(ST_GeomFromGeoJSON(?), Point(pokestop.lon, pokestop.lat))",
			values: [53, 54, 10, 13, JSON.stringify(polygon)]
		});
	});
});
