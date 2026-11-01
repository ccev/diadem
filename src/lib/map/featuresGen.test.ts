import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { MapObjectsStateType } from "@/lib/mapObjects/mapObjectsState.svelte";
import { FeatureTypes, type MapObjectIconFeature } from "./render/featureTypes";

const renderer = vi.hoisted(() => ({
	render: vi.fn(),
	focused: undefined as string | undefined,
	revision: 0
}));
vi.mock("@/lib/map/render/manageGeojson", () => ({
	updateMapObjectsGeoJson: vi.fn(),
	needsMapObjectsGeoJsonUpdate: () => false,
	refreshMapObjectsGeoJson: vi.fn()
}));
vi.mock("@/lib/map/render/renderMapObjects", () => ({ getRenderer: () => renderer }));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte.js", () => ({
	getCurrentSelectedData: () => undefined,
	isCurrentSelectedOverwrite: () => false
}));
vi.mock("@/lib/services/userSettings.svelte", () => ({
	getUserSettings: () => ({ actions: {}, filters: { route: { enabled: false } } })
}));
vi.mock("$lib/features/focusedRoute.svelte.js", () => ({
	getFocusedRouteMapId: () => renderer.focused,
	setFocusedRouteMapId: vi.fn()
}));

vi.mock("@/lib/mapObjects/mapObjectsState.svelte.js", () => ({
	getMapObjectsRevision: () => renderer.revision
}));

import { updateMapObjectsGeoJson } from "./render/manageGeojson";
import {
	deleteAllFeatures,
	deleteAllFeaturesOfType,
	updateFeatures,
	needsFeatureUpdate
} from "./featuresGen.svelte";
import { setFocusedRouteMapId } from "$lib/features/focusedRoute.svelte.js";

const pokemon = {
	id: "p",
	mapId: "pokemon-p",
	type: MapObjectType.POKEMON,
	lat: 0,
	lon: 0,
	name: "old"
};
const gym = { id: "g", mapId: "gym-g", type: MapObjectType.GYM, lat: 0, lon: 0, name: "gym" };

beforeEach(() => {
	deleteAllFeatures();
	renderer.focused = undefined;
	vi.mocked(updateMapObjectsGeoJson).mockReset();
	vi.mocked(setFocusedRouteMapId).mockReset();
	renderer.render.mockReset().mockImplementation((data: typeof pokemon): MapObjectIconFeature[] => [
		{
			type: "Feature",
			id: data.mapId,
			geometry: { type: "Point", coordinates: [data.lon, data.lat] },
			properties: {
				id: data.mapId,
				type: FeatureTypes.ICON,
				imageId: "test",
				imageUrl: "/test.png",
				imageSize: 1,
				selectedScale: 1,
				dimmed: false,
				expires: null,
				textLabel: data.name
			}
		}
	]);
});

describe("progressive feature generation", () => {
	it.each([MapObjectType.POKEMON, MapObjectType.ROUTE])(
		"does not repopulate an invalidated %s cache before its data is ready",
		(type) => {
			const waiting = { ...pokemon, type, mapId: `${type}-p` };
			const objects = {
				[waiting.mapId]: waiting,
				[gym.mapId]: gym
			} as unknown as MapObjectsStateType;
			updateFeatures(objects);
			deleteAllFeaturesOfType(type);
			renderer.render.mockClear();

			updateFeatures(objects, [MapObjectType.GYM]);
			expect(renderer.render).not.toHaveBeenCalled();
			expect(
				vi
					.mocked(updateMapObjectsGeoJson)
					.mock.calls.at(-1)?.[0]
					.map((f) => f.properties.id)
			).toEqual([gym.mapId]);

			const fresh = { ...waiting, name: "fresh" };
			updateFeatures({ ...objects, [waiting.mapId]: fresh } as unknown as MapObjectsStateType, [
				type
			]);
			expect(renderer.render).toHaveBeenCalledExactlyOnceWith(fresh, false, false);
			const features = vi.mocked(updateMapObjectsGeoJson).mock.calls.at(-1)![0];
			expect(features).toHaveLength(2);
			expect(features.find((f) => f.properties.id === waiting.mapId)?.properties).toMatchObject({
				textLabel: "fresh"
			});
		}
	);

	it("retains global state for route-focus checks when rendering only a completed family", () => {
		renderer.focused = "route-r";
		const route = { id: "r", mapId: "route-r", type: MapObjectType.ROUTE, lat: 0, lon: 0 };
		updateFeatures({ [gym.mapId]: gym, [route.mapId]: route } as unknown as MapObjectsStateType, [
			MapObjectType.GYM
		]);
		expect(setFocusedRouteMapId).not.toHaveBeenCalled();
		expect(renderer.render).toHaveBeenCalledExactlyOnceWith(gym, false, false);
	});

	it("still removes cleared families even when no new family is ready", () => {
		updateFeatures({
			[pokemon.mapId]: pokemon,
			[gym.mapId]: gym
		} as unknown as MapObjectsStateType);
		updateFeatures({}, []);
		expect(updateMapObjectsGeoJson).toHaveBeenLastCalledWith([]);
	});
});

describe("nearby pokemon scattering", () => {
	it.each(["nearby_stop", "nearby_cell"])(
		"keeps %s groups scattered without republishing unchanged polling batches",
		(seen_type) => {
			const first = { ...pokemon, seen_type };
			const second = { ...first, id: "q", mapId: "pokemon-q" };
			const objects = {
				[first.mapId]: first,
				[second.mapId]: second
			} as unknown as MapObjectsStateType;

			updateFeatures(objects, [MapObjectType.POKEMON]);
			const features = vi.mocked(updateMapObjectsGeoJson).mock.lastCall![0];
			const positions = features.map(
				(feature) => (feature as MapObjectIconFeature).geometry.coordinates
			);
			expect(positions).toHaveLength(2);
			expect(positions[0]).not.toEqual([first.lon, first.lat]);
			expect(positions[1]).not.toEqual(positions[0]);
			expect([first.lon, first.lat, second.lon, second.lat]).toEqual([0, 0, 0, 0]);

			renderer.render.mockClear();
			vi.mocked(updateMapObjectsGeoJson).mockClear();
			updateFeatures(
				{ [second.mapId]: second, [first.mapId]: first } as unknown as MapObjectsStateType,
				[MapObjectType.POKEMON]
			);
			expect(renderer.render).not.toHaveBeenCalled();
			expect(updateMapObjectsGeoJson).not.toHaveBeenCalled();
			expect(
				features.map((feature) => (feature as MapObjectIconFeature).geometry.coordinates)
			).toEqual(positions);

			updateFeatures({ [first.mapId]: first } as unknown as MapObjectsStateType, [
				MapObjectType.POKEMON
			]);
			expect(renderer.render).not.toHaveBeenCalled();
			expect(vi.mocked(updateMapObjectsGeoJson).mock.lastCall![0]).toHaveLength(1);
			expect(vi.mocked(updateMapObjectsGeoJson).mock.lastCall![0][0].geometry).toMatchObject({
				coordinates: [first.lon, first.lat]
			});
		}
	);

	it("waits for nearby pokemon data before generating scattered features", () => {
		const first = { ...pokemon, seen_type: "nearby_stop" };
		const second = { ...first, id: "q", mapId: "pokemon-q" };
		const objects = {
			[first.mapId]: first,
			[second.mapId]: second,
			[gym.mapId]: gym
		} as unknown as MapObjectsStateType;

		updateFeatures(objects, [MapObjectType.GYM]);
		expect(renderer.render).toHaveBeenCalledExactlyOnceWith(gym, false, false);
		expect(vi.mocked(updateMapObjectsGeoJson).mock.lastCall![0]).toHaveLength(1);

		updateFeatures(objects, [MapObjectType.POKEMON]);
		expect(renderer.render).toHaveBeenCalledTimes(3);
		const features = vi.mocked(updateMapObjectsGeoJson).mock.lastCall![0];
		expect(features).toHaveLength(3);
		for (const feature of features.filter((feature) =>
			feature.properties.id.startsWith("pokemon-")
		)) {
			expect(feature.geometry).not.toMatchObject({ coordinates: [first.lon, first.lat] });
		}
	});
});

it("refreshes payload changes without movement and reuses unchanged features", () => {
	const objects = { [gym.mapId]: gym } as unknown as MapObjectsStateType;
	updateFeatures(objects);
	expect(needsFeatureUpdate()).toBe(false);
	renderer.render.mockClear();
	updateFeatures(objects);
	expect(renderer.render).not.toHaveBeenCalled();
	updateFeatures({ [gym.mapId]: { ...gym, name: "changed" } } as unknown as MapObjectsStateType);
	expect(renderer.render).toHaveBeenCalledOnce();
	expect(vi.mocked(updateMapObjectsGeoJson).mock.lastCall![0][0].properties).toMatchObject({
		textLabel: "changed"
	});
});

it("keeps invalidated families pending until final reconciliation", () => {
	const objects = { [gym.mapId]: gym } as unknown as MapObjectsStateType;
	updateFeatures(objects);
	expect(needsFeatureUpdate()).toBe(false);
	deleteAllFeaturesOfType(MapObjectType.GYM);
	expect(needsFeatureUpdate()).toBe(true);
	updateFeatures(objects, []);
	expect(needsFeatureUpdate()).toBe(true);
	updateFeatures(objects);
	expect(needsFeatureUpdate()).toBe(false);
	renderer.revision++;
	expect(needsFeatureUpdate()).toBe(true);
});

it("does not invalidate a rendered map when clearing an empty optional family", () => {
	updateFeatures({ [gym.mapId]: gym } as unknown as MapObjectsStateType);
	expect(needsFeatureUpdate()).toBe(false);
	deleteAllFeaturesOfType(MapObjectType.BIOME);
	expect(needsFeatureUpdate()).toBe(false);
});
