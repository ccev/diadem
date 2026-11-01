import { getS2CellCenter, getS2CellsInBounds, parseS2CellId } from "@/lib/utils/s2";
import { r1, s1, s2 } from "s2js";
import { describe, expect, it } from "vitest";

const id = 5160937946483785728n;

describe("S2 cell centers", () => {
	it("returns latitude and longitude in degrees", () => {
		const center = getS2CellCenter(5160937946483785728n);
		expect(center.lat).toBeCloseTo(49.464671911756724, 10);
		expect(center.lon).toBeCloseTo(10.9858364060443, 10);
	});

	it.each([0, 14, 16, 30])(
		"supports level %i cells without biome-specific restrictions",
		(level) => {
			const leaf = s2.cellid.fromLatLng(s2.LatLng.fromDegrees(-33.86, 151.2));
			const cellId = s2.cellid.parent(leaf, level);
			const originalCenter = s2.LatLng.fromPoint(s2.Cell.fromCellID(cellId).center());
			const center = getS2CellCenter(cellId);
			expect(center.lat).toBeCloseTo((originalCenter.lat * 180) / Math.PI, 12);
			expect(center.lon).toBeCloseTo((originalCenter.lng * 180) / Math.PI, 12);
		}
	);
});

describe("S2 cell IDs", () => {
	it("keeps uint64 IDs precise and rejects malformed or invalid IDs", () => {
		expect(parseS2CellId(id.toString())).toBe(id);
		for (const value of [
			"479f55b7f",
			"-1",
			"0",
			"1e18",
			"18446744073709551616",
			"01",
			" 1",
			"0x123",
			""
		]) {
			expect(parseS2CellId(value)).toBeUndefined();
		}
	});

	it.each([0, 14, 16, 30])("optionally requires level %i", (level) => {
		const leaf = s2.cellid.fromLatLng(s2.LatLng.fromDegrees(-33.86, 151.2));
		const cellId = s2.cellid.parent(leaf, level);
		expect(parseS2CellId(cellId.toString())).toBe(cellId);
		expect(parseS2CellId(cellId.toString(), level)).toBe(cellId);
		expect(parseS2CellId(cellId.toString(), (level + 1) % 31)).toBeUndefined();
	});

	it("rejects wrong-level and packed IDs when level 16 is required", () => {
		expect(parseS2CellId("4930867520941", 16)).toBeUndefined();
		expect(parseS2CellId(s2.cellid.parent(id, 15).toString(), 16)).toBeUndefined();
	});
});

describe("S2 cells in bounds", () => {
	it.each([0, 10, 14, 16, 17, 30])("covers the viewport with level %i cells", (level) => {
		const leaf = s2.cellid.fromLatLng(s2.LatLng.fromDegrees(-33.86, 151.2));
		const cellId = s2.cellid.parent(leaf, level);
		const center = getS2CellCenter(cellId);
		const padding = 1 / 2 ** level;
		const cells = getS2CellsInBounds(
			{
				minLat: center.lat - padding,
				maxLat: center.lat + padding,
				minLon: center.lon - padding,
				maxLon: center.lon + padding
			},
			level,
			100
		)!;
		expect(cells).toContain(cellId);
		expect(cells.every((cell) => s2.cellid.level(cell) === level)).toBe(true);
	});

	it.each([10, 14, 16, 17])(
		"matches fixed-level coverings for ordinary level %i viewports",
		(level) => {
			const center = getS2CellCenter(id);
			const bounds = {
				minLat: center.lat - 0.0001,
				maxLat: center.lat + 0.0001,
				minLon: center.lon - 0.0001,
				maxLon: center.lon + 0.0001
			};
			const southwest = s2.LatLng.fromDegrees(bounds.minLat, bounds.minLon);
			const northeast = s2.LatLng.fromDegrees(bounds.maxLat, bounds.maxLon);
			const region = new s2.Rect(
				new r1.Interval(southwest.lat, northeast.lat),
				s1.Interval.fromEndpoints(southwest.lng, northeast.lng)
			);
			const original = new s2.RegionCoverer({ minLevel: level, maxLevel: level, maxCells: 100 });
			expect(getS2CellsInBounds(bounds, level, 100)).toEqual(Array.from(original.covering(region)));
		}
	);

	it("allows a covering to exceed the target within the loose expansion guard", () => {
		const cells = getS2CellsInBounds({ minLat: -90, maxLat: 90, minLon: -180, maxLon: 180 }, 0, 2)!;
		expect(cells).toHaveLength(6);
	});

	it.each([10, 16, 30])(
		"rejects huge level %i expansions before allocating their cells",
		(level) => {
			expect(
				getS2CellsInBounds({ minLat: -85, maxLat: 85, minLon: -180, maxLon: 180 }, level, 100)
			).toBeUndefined();
		}
	);

	it.each([0, 180, 360])("keeps a full longitude span starting at %s degrees", (minLon) => {
		expect(
			getS2CellsInBounds({ minLat: -85, maxLat: 85, minLon, maxLon: minLon + 360 }, 16, 100)
		).toBeUndefined();
	});

	it("handles viewports crossing the antimeridian and wrapped longitudes", () => {
		const cells = getS2CellsInBounds(
			{ minLat: 0.01, maxLat: 0.011, minLon: 179.999, maxLon: 180.001 },
			16,
			100
		)!;
		const wrapped = getS2CellsInBounds(
			{ minLat: 0.01, maxLat: 0.011, minLon: 179.999, maxLon: -179.999 },
			16,
			100
		)!;
		expect(cells.length).toBeGreaterThan(0);
		expect(cells).toEqual(wrapped);
		for (const offset of [-720, -360, 360, 720]) {
			expect(
				getS2CellsInBounds(
					{
						minLat: 0.01,
						maxLat: 0.011,
						minLon: 179.999 + offset,
						maxLon: 180.001 + offset
					},
					16,
					100
				)
			).toEqual(cells);
		}
	});
});
