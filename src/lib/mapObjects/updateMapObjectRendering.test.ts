import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MapObjectType } from "./mapObjectTypes";
import type { MapObjectIconFeature } from "@/lib/map/render/featureTypes";

const scene = vi.hoisted(() => {
	vi.stubGlobal("$state", (value: unknown) => value);
	return {
		map: { getZoom: () => 15 },
		filters: {
			gym: { category: "gym", enabled: true },
			pokemon: { category: "pokemon", enabled: true }
		},
		selected: undefined,
		publish: vi.fn(),
		fetch: vi.fn()
	};
});
vi.mock("@/lib/map/map.svelte", () => ({ getMap: () => scene.map }));
vi.mock("@/lib/features/activeSearch.svelte.js", () => ({ getActiveSearch: () => undefined }));
vi.mock("@/lib/mapObjects/mapBounds", () => ({
	getBounds: () => ({ minLat: 0, minLon: 0, maxLat: 1, maxLon: 1 })
}));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({
	getCurrentSelectedData: () => scene.selected,
	isCurrentSelectedOverwrite: () => false
}));
vi.mock("@/lib/mapObjects/dataLimitState.svelte", () => ({
	clearAllDataLimits: vi.fn(),
	clearDataLimit: vi.fn(),
	getDataLimit: () => undefined,
	setDataLimit: vi.fn()
}));
vi.mock("@/lib/mapObjects/s2cells.js", () => ({ getS2CellMapObjects: () => [] }));
vi.mock("@/lib/mapObjects/weather.svelte", () => ({ updateWeather: vi.fn() }));
vi.mock("@/lib/services/user/checkPerm", () => ({ hasAnyFeatureAnywhere: () => true }));
vi.mock("@/lib/services/user/userDetails.svelte", () => ({
	getUserDetails: () => ({ permissions: {} })
}));
vi.mock("@/lib/services/userSettings.svelte.js", () => ({
	getUserSettings: () => ({ filters: scene.filters, actions: {} })
}));
vi.mock("@/lib/services/config/config", () => ({
	getConfig: () => ({ general: { msgpack: false } })
}));
vi.mock("@/lib/native/runtime", () => ({ isNative: () => false }));
vi.mock("$lib/features/focusedRoute.svelte.js", () => ({
	getFocusedRouteMapId: () => null,
	setFocusedRouteMapId: vi.fn()
}));
vi.mock("@/lib/map/render/manageGeojson", () => ({ updateMapObjectsGeoJson: scene.publish }));
vi.mock("@/lib/map/render/renderMapObjects", () => ({
	getRenderer: () => ({
		render: (obj: {
			mapId: string;
			lat: number;
			lon: number;
			name: string;
			expires: number;
		}): MapObjectIconFeature[] =>
			obj.expires < Date.now() / 1000
				? []
				: [
						{
							type: "Feature",
							id: obj.mapId,
							geometry: { type: "Point", coordinates: [obj.lon, obj.lat] },
							properties: {
								id: obj.mapId,
								type: 0,
								imageId: "test",
								imageUrl: "/test.png",
								imageSize: 1,
								selectedScale: 1,
								dimmed: false,
								expires: obj.expires,
								textLabel: obj.name
							}
						}
					]
	})
}));

import { cancelMapObjectRequests, clearMap, updateAllMapObjects } from "./updateMapObject";
import { delMapObject, getMapObjects } from "./mapObjectsState.svelte";
import { needsFeatureUpdate } from "@/lib/map/featuresGen.svelte";
import { updateWeather } from "./weather.svelte";

const gym = {
	type: MapObjectType.GYM,
	mapId: "gym-g",
	id: "g",
	lat: 0,
	lon: 0,
	name: "gym",
	expires: 110
};
const pokemon = {
	type: MapObjectType.POKEMON,
	mapId: "pokemon-p",
	id: "p",
	lat: 0,
	lon: 0,
	name: "pokemon",
	expires: 120
};
const response = (data: unknown[]) =>
	new Response(JSON.stringify({ examined: data.length, data }), {
		headers: { "Content-Type": "application/json" }
	});

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(100_000);
	scene.filters.gym.enabled = true;
	scene.filters.pokemon.enabled = true;
	scene.fetch
		.mockReset()
		.mockImplementation(async (url: string) => response([url === "/api/gym" ? gym : pokemon]));
	vi.stubGlobal("fetch", scene.fetch);
	vi.mocked(updateWeather).mockReset().mockResolvedValue(undefined);
	clearMap();
	scene.publish.mockClear();
});
afterEach(() => {
	cancelMapObjectRequests();
	vi.useRealTimers();
});

it.each(["empty", "replayed"])(
	"skips every publication on an unchanged %s delta poll",
	async (mode) => {
		await updateAllMapObjects();
		scene.publish.mockClear();
		const release = Promise.withResolvers<void>();
		scene.fetch.mockImplementation(async (url: string) => {
			if (url === "/api/pokemon") await release.promise;
			return response(mode === "empty" ? [] : [url === "/api/gym" ? gym : pokemon]);
		});
		const batch = updateAllMapObjects(true, true);
		await vi.advanceTimersByTimeAsync(1);
		expect(scene.publish).not.toHaveBeenCalled();
		release.resolve();
		await batch;
		expect(scene.publish).not.toHaveBeenCalled();
		expect(needsFeatureUpdate()).toBe(false);
	}
);

it("publishes changed stationary markers before slower families and weather", async () => {
	await updateAllMapObjects();
	scene.publish.mockClear();
	const slower = Promise.withResolvers<Response>();
	const weather = Promise.withResolvers<void>();
	scene.fetch.mockImplementation((url: string) =>
		url === "/api/gym" ? Promise.resolve(response([{ ...gym, name: "changed" }])) : slower.promise
	);
	vi.mocked(updateWeather).mockReturnValue(weather.promise);
	const batch = updateAllMapObjects(true, true);
	await vi.advanceTimersByTimeAsync(1);
	expect(scene.publish).toHaveBeenCalledOnce();
	expect(
		scene.publish.mock.lastCall![0].find((f: MapObjectIconFeature) => f.id === gym.mapId).properties
			.textLabel
	).toBe("changed");
	expect(needsFeatureUpdate()).toBe(true);
	slower.resolve(response([]));
	weather.resolve();
	await batch;
	expect(needsFeatureUpdate()).toBe(false);
});

it("expires features without new records and advances the next expiry", async () => {
	await updateAllMapObjects();
	scene.fetch.mockImplementation(async () => response([]));
	scene.publish.mockClear();
	vi.setSystemTime(111_000);
	expect(needsFeatureUpdate()).toBe(true);
	await updateAllMapObjects(true, true);
	expect(scene.publish.mock.lastCall![0].map((f: MapObjectIconFeature) => f.id)).toEqual([
		pokemon.mapId
	]);
	expect(needsFeatureUpdate()).toBe(false);
	scene.publish.mockClear();
	await updateAllMapObjects(true, true);
	expect(scene.publish).not.toHaveBeenCalled();
	vi.setSystemTime(121_000);
	await updateAllMapObjects(true, true);
	expect(scene.publish.mock.lastCall![0]).toEqual([]);
	expect(needsFeatureUpdate()).toBe(false);
});

it.each(["disabled", "deleted"])(
	"publishes %s families even if all responses are empty",
	async (mode) => {
		await updateAllMapObjects();
		scene.publish.mockClear();
		if (mode === "disabled") scene.filters.gym.enabled = false;
		else delMapObject(gym.mapId);
		scene.fetch.mockImplementation(async () => response([]));
		await updateAllMapObjects(true, true);
		expect(getMapObjects()[gym.mapId]).toBeUndefined();
		expect(scene.publish.mock.lastCall![0].map((f: MapObjectIconFeature) => f.id)).toEqual([
			pokemon.mapId
		]);
		expect(needsFeatureUpdate()).toBe(false);
	}
);
