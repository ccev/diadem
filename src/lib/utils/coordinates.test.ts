import { describe, it, expect } from "vitest";
import { Coords } from "./coordinates";

// Mock maplibre-gl since it's a browser dependency
vi.mock("maplibre-gl", () => {
	class LngLat {
		lng: number;
		lat: number;
		constructor(lng: number, lat: number) {
			this.lng = lng;
			this.lat = lat;
		}
	}
	return { default: { LngLat }, LngLat };
});

import { vi } from "vitest";

describe("Coords", () => {
	describe("constructor", () => {
		it("creates coords with lat and lon", () => {
			const c = new Coords(51.5, -0.12);
			expect(c.lat).toBe(51.5);
			expect(c.lon).toBe(-0.12);
		});
	});

	describe("infer", () => {
		it("infers from LngLat-like object (lng/lat)", () => {
			const c = Coords.infer({ lng: -0.12, lat: 51.5 });
			expect(c.lat).toBe(51.5);
			expect(c.lon).toBe(-0.12);
		});

		it("infers from LatLon object (lat/lon)", () => {
			const c = Coords.infer({ lat: 51.5, lon: -0.12 });
			expect(c.lat).toBe(51.5);
			expect(c.lon).toBe(-0.12);
		});

		it("infers from array [lng, lat]", () => {
			const c = Coords.infer([-0.12, 51.5]);
			expect(c.lat).toBe(51.5);
			expect(c.lon).toBe(-0.12);
		});

		it("throws on invalid input", () => {
			// @ts-expect-error testing invalid input
			expect(() => Coords.infer({ x: 1, y: 2 })).toThrow("Invalid Coordinate input");
		});
	});

	describe("format conversions", () => {
		const c = new Coords(51.5, -0.12);

		it("converts to maplibre LngLat", () => {
			const result = c.maplibre();
			expect(result.lng).toBe(-0.12);
			expect(result.lat).toBe(51.5);
		});

		it("converts to internal format", () => {
			const result = c.internal();
			expect(result).toEqual({ lat: 51.5, lon: -0.12 });
		});

		it("converts to GeoJSON format [lng, lat]", () => {
			const result = c.geojson();
			expect(result).toEqual([-0.12, 51.5]);
		});
	});
});
