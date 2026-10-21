import { describe, expect, it } from "vitest";
import {
	isWithinRange,
	rangeBounds,
	rangeCircle,
	rangeDestination,
	rangeDistanceMeters,
	RANGE_EARTH_RADIUS_METERS,
	type RangePosition
} from "./rangeGeometry";
import {
	RANGE_FORTS,
	RANGE_POKEMON,
	RANGE_POKEMON_EXTENDED,
	RADIUS_POKEMON,
	RADIUS_SCOUT_GMO
} from "@/lib/constants";

// Independent statement of the supplied formula, not the production inverse.
function visibilityDistance(from: RangePosition, to: RangePosition) {
	const [lon1, lat1] = from.map((value) => (value * Math.PI) / 180);
	const [lon2, lat2] = to.map((value) => (value * Math.PI) / 180);
	const a =
		Math.sin((lat2 - lat1) / 2) ** 2 +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
	return 2 * 6367000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

describe("range geometry", () => {
	it("uses [longitude, latitude] degrees and returns meters on the visibility sphere", () => {
		expect(RANGE_EARTH_RADIUS_METERS).toBe(6367000);
		expect(rangeDistanceMeters([13, 0], [14, 0])).toBeCloseTo((6367000 * Math.PI) / 180, 7);
		expect(rangeDistanceMeters([13, 60], [14, 60])).toBeCloseTo(
			visibilityDistance([13, 60], [14, 60]),
			7
		);
		expect(rangeDistanceMeters([13, 60], [14, 60])).toBeLessThan(55600);
		expect(rangeDistanceMeters([13, 60], [13, 60])).toBe(0);
	});

	it("includes exactly 70 m without adding a tolerance, and preserves custom ranges", () => {
		const north = (meters: number): RangePosition => [0, ((meters / 6367000) * 180) / Math.PI];
		expect(rangeDistanceMeters([0, 0], north(70))).toBe(70);
		expect(isWithinRange([0, 0], north(69.999))).toBe(true);
		expect(isWithinRange([0, 0], north(70))).toBe(true);
		expect(isWithinRange([0, 0], north(70.001))).toBe(false);
		expect(isWithinRange([0, 0], north(79), 80)).toBe(true);
		expect(isWithinRange([0, 0], north(79), 40)).toBe(false);
	});

	it.each<RangePosition>([
		[0, 0],
		[13, 52],
		[-73, -45],
		[179.9999, 75],
		[-179.9999, -75],
		[30, 89.9999],
		[-30, -89.9999],
		[42, 90],
		[42, -90]
	])("matches every sampled circle vertex at %j", (...center) => {
		for (const radius of [
			RANGE_POKEMON,
			RANGE_POKEMON_EXTENDED,
			RANGE_FORTS,
			RADIUS_POKEMON,
			RADIUS_SCOUT_GMO
		]) {
			for (const steps of [64, 96]) {
				const ring = rangeCircle(center, radius, { steps }).geometry.coordinates[0];
				for (const vertex of ring.slice(0, steps)) {
					expect(visibilityDistance(center, vertex as [number, number])).toBeCloseTo(radius, 5);
					expect(vertex[1]).toBeGreaterThanOrEqual(-90);
					expect(vertex[1]).toBeLessThanOrEqual(90);
				}
				expect(ring.at(-1)).toEqual(ring[0]);
				for (let i = 1; i < ring.length; i++)
					expect(Math.abs(ring[i][0] - ring[i - 1][0])).toBeLessThanOrEqual(180);
			}
		}
	});

	it("preserves sampling, properties and meter units", () => {
		const properties = { fillColor: "#abc", strokeColor: "transparent" };
		const circle = rangeCircle([0, 0], 1000, { steps: 96, properties });
		expect(circle.properties).toEqual(properties);
		expect(circle.geometry.coordinates[0]).toHaveLength(97);
		expect(rangeDistanceMeters([0, 0], rangeDestination([0, 0], 1 * 1000, 90))).toBeCloseTo(
			1000,
			5
		);
		expect(rangeDestination([0, 0], 1000, 0)[0]).toBe(0);
	});

	it("keeps dateline circles local in the center's world copy and polar caps closed through the pole", () => {
		for (const longitude of [179.9999, -179.9999, 539.9999]) {
			const ring = rangeCircle([longitude, 0], 70).geometry.coordinates[0];
			for (const vertex of ring) expect(Math.abs(vertex[0] - longitude)).toBeLessThan(0.001);
		}
		for (const latitude of [89.9999, -89.9999, 90, -90]) {
			const ring = rangeCircle([42, latitude], 1000).geometry.coordinates[0];
			expect(ring.slice(65, -1).map((vertex) => vertex[1])).toEqual(
				Array(3).fill(Math.sign(latitude) * 90)
			);
		}
	});

	it("is finite and symmetric across wrapped longitudes and at antipodes", () => {
		for (const [from, to] of [
			[
				[179.9999, 80],
				[-179.9999, 80]
			],
			[
				[30, -89.9999],
				[-150, -89.9999]
			],
			[
				[0, 0],
				[180, 0]
			],
			[
				[24, 31.25],
				[204, -31.25]
			]
		] as [RangePosition, RangePosition][]) {
			expect(Number.isFinite(rangeDistanceMeters(from, to))).toBe(true);
			expect(rangeDistanceMeters(from, to)).toBeCloseTo(rangeDistanceMeters(to, from), 7);
			expect(rangeDistanceMeters(from, to)).toBeCloseTo(
				rangeDistanceMeters([from[0] + 360, from[1]], to),
				7
			);
		}
		expect(rangeDistanceMeters([0, 0], [180, 0])).toBe(Math.PI * 6367000);
	});

	it.each<RangePosition>([
		[13, 52],
		[-73, -45],
		[179.9999, 75],
		[-179.9999, -75],
		[30, 89.9999],
		[-30, -89.9999]
	])("query bounds contain the entire 80 m range at %j", (...center) => {
		const bounds = rangeBounds(center, 80);
		for (let bearing = 0; bearing < 360; bearing += 0.5) {
			const [lon, lat] = rangeDestination(center, 80, bearing);
			expect(lon).toBeGreaterThanOrEqual(bounds.minLon);
			expect(lon).toBeLessThanOrEqual(bounds.maxLon);
			expect(lat).toBeGreaterThanOrEqual(bounds.minLat - 1e-12);
			expect(lat).toBeLessThanOrEqual(bounds.maxLat + 1e-12);
		}
	});

	it("rejects unusable polygon sampling and radii", () => {
		expect(() => rangeCircle([0, 0], 70, { steps: 3 })).toThrow(RangeError);
		for (const radius of [-1, NaN, Infinity, (Math.PI * 6367000) / 2])
			expect(() => rangeCircle([0, 0], radius)).toThrow(RangeError);
	});
});
