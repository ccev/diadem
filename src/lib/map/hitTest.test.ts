import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
	map: { queryRenderedFeatures: vi.fn(), getLayer: vi.fn(() => ({})) },
	objects: {} as Record<string, unknown>,
	endpoint: vi.fn()
}));
vi.mock("@/lib/map/map.svelte", () => ({ getMap: () => state.map }));
vi.mock("@/lib/mapObjects/mapObjectsState.svelte", () => ({ getMapObjects: () => state.objects }));
vi.mock("@/lib/utils/routeUtils", () => ({ getRouteEndpointFort: state.endpoint }));
vi.mock("@/lib/map/render/featureTypes", () => ({
	isFeatureIcon: (feature: { properties: { type: number } }) => feature.properties.type === 0
}));
import { getMapObjectAtPoint } from "./hitTest";
import type { MapMouseEvent } from "maplibre-gl";
const point = { x: 5, y: 10 } as MapMouseEvent["point"];
beforeEach(() => {
	state.objects = {};
	vi.clearAllMocks();
});

describe("map object hit testing", () => {
	it("prefers a marker over a modifier underlay", () => {
		const marker = { id: "marker", type: "pokemon" };
		state.objects = { marker, glow: { id: "glow" } };
		state.map.queryRenderedFeatures.mockReturnValue([
			{ properties: { id: "glow", isModifierUnderlay: true } },
			{ properties: { id: "marker" } }
		]);
		expect(getMapObjectAtPoint(point)).toBe(marker);
	});
	it("resolves route endpoint forts even when they are not loaded as standalone forts", () => {
		const route = { id: "route", type: "route" };
		const endpoint = { id: "fort", type: "pokestop" };
		state.objects = { route };
		state.map.queryRenderedFeatures.mockReturnValue([
			{ properties: { id: "endpoint", type: 0, routeEndpointFortId: "fort" } }
		]);
		state.endpoint.mockReturnValue(endpoint);
		expect(getMapObjectAtPoint(point)).toBe(endpoint);
		expect(state.endpoint).toHaveBeenCalledWith([route], "fort");
	});
	it("leaves empty map space to the location interaction", () => {
		state.map.queryRenderedFeatures.mockReturnValue([]);
		expect(getMapObjectAtPoint(point)).toBeUndefined();
	});
});
