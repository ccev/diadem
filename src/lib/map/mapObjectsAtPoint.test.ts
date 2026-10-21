import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureTypes } from "@/lib/map/render/featureTypes";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
const state = vi.hoisted(() => ({
	map: { queryRenderedFeatures: vi.fn(), getLayer: vi.fn(() => ({})) },
	objects: {} as Record<string, unknown>,
	endpoint: vi.fn()
}));
vi.mock("@/lib/map/map.svelte", () => ({ getMap: () => state.map }));
vi.mock("@/lib/mapObjects/mapObjectsState.svelte", () => ({ getMapObjects: () => state.objects }));
vi.mock("@/lib/utils/routeUtils", () => ({ getRouteEndpointFort: state.endpoint }));
import { getMapObjectAtPoint } from "./mapObjectsAtPoint";
import type { MapMouseEvent } from "maplibre-gl";
const point = { x: 5, y: 10 } as MapMouseEvent["point"];
beforeEach(() => {
	state.objects = {};
	vi.clearAllMocks();
});

describe("map objects at a point", () => {
	it("prefers a marker over a modifier underlay", () => {
		const marker = { id: "marker", type: "pokemon" };
		state.objects = { marker, glow: { id: "glow" } };
		state.map.queryRenderedFeatures.mockReturnValue([
			{ properties: { id: "glow", isModifierUnderlay: true } },
			{ properties: { id: "marker" } }
		]);
		expect(getMapObjectAtPoint(point)).toBe(marker);
		expect(getMapObjectAtPoint(point, { quickActions: true })).toBe(marker);
	});
	it.each([MapObjectType.BIOME, MapObjectType.S2_CELL, MapObjectType.NEST])(
		"keeps normal clicks on %s polygons but excludes them from quick actions",
		(type) => {
			const area = { id: "area", type };
			state.objects = { area };
			state.map.queryRenderedFeatures.mockReturnValue([
				{ properties: { id: "area", type: FeatureTypes.POLYGON } }
			]);
			expect(getMapObjectAtPoint(point)).toBe(area);
			expect(getMapObjectAtPoint(point, { quickActions: true })).toBeUndefined();
		}
	);
	it.each([MapObjectType.BIOME, MapObjectType.S2_CELL, MapObjectType.NEST])(
		"finds eligible markers beneath excluded %s polygons",
		(type) => {
			const area = { id: "area", type };
			const marker = { id: "marker", type: MapObjectType.POKEMON };
			state.objects = { area, marker };
			state.map.queryRenderedFeatures.mockReturnValue([
				{ properties: { id: "area", type: FeatureTypes.POLYGON } },
				{ properties: { id: "marker", type: FeatureTypes.ICON } }
			]);
			expect(getMapObjectAtPoint(point, { quickActions: true })).toBe(marker);
		}
	);
	it("accepts nest circles even when their icon is above them", () => {
		const nest = { id: "nest", type: MapObjectType.NEST };
		state.objects = { nest };
		state.map.queryRenderedFeatures.mockReturnValue([
			{ properties: { id: "nest", type: FeatureTypes.ICON } },
			{ properties: { id: "nest", type: FeatureTypes.CIRCLE } },
			{ properties: { id: "nest", type: FeatureTypes.POLYGON } }
		]);
		expect(getMapObjectAtPoint(point, { quickActions: true })).toBe(nest);
	});
	it("does not accept a nest icon outside its circle", () => {
		const nest = { id: "nest", type: MapObjectType.NEST };
		state.objects = { nest };
		state.map.queryRenderedFeatures.mockReturnValue([
			{ properties: { id: "nest", type: FeatureTypes.ICON } },
			{ properties: { id: "nest", type: FeatureTypes.POLYGON } }
		]);
		expect(getMapObjectAtPoint(point, { quickActions: true })).toBeUndefined();
	});
	it.each([MapObjectType.BIOME, MapObjectType.S2_CELL])(
		"excludes all %s features from quick actions",
		(type) => {
			state.objects = { area: { id: "area", type } };
			state.map.queryRenderedFeatures.mockReturnValue([
				{ properties: { id: "area", type: FeatureTypes.ICON } },
				{ properties: { id: "area", type: FeatureTypes.CIRCLE } }
			]);
			expect(getMapObjectAtPoint(point, { quickActions: true })).toBeUndefined();
		}
	);
	it("resolves route endpoint forts even when they are not loaded as standalone forts", () => {
		const route = { id: "route", type: "route" };
		const endpoint = { id: "fort", type: "pokestop" };
		state.objects = { route };
		state.map.queryRenderedFeatures.mockReturnValue([
			{ properties: { id: "endpoint", type: 0, routeEndpointFortId: "fort" } }
		]);
		state.endpoint.mockReturnValue(endpoint);
		expect(getMapObjectAtPoint(point)).toBe(endpoint);
		expect(getMapObjectAtPoint(point, { quickActions: true })).toBe(endpoint);
		expect(state.endpoint).toHaveBeenCalledWith([route], "fort");
	});
	it("leaves empty map space to the location interaction", () => {
		state.map.queryRenderedFeatures.mockReturnValue([]);
		expect(getMapObjectAtPoint(point)).toBeUndefined();
		expect(getMapObjectAtPoint(point, { quickActions: true })).toBeUndefined();
	});
});
