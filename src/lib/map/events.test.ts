import { beforeEach, expect, it, vi } from "vitest";
import type { Map, MapStyleLoadEvent } from "maplibre-gl";

const scene = vi.hoisted(() => ({
	map: undefined as Map | undefined,
	tick: vi.fn(),
	objects: {}
}));
vi.mock("svelte", () => ({ tick: scene.tick }));
vi.mock("@/lib/map/featuresGen.svelte", () => ({ updateFeatures: vi.fn() }));
vi.mock("@/lib/map/map.svelte", () => ({
	getMap: () => scene.map,
	addMapStyleVersion: vi.fn()
}));
vi.mock("@/lib/mapObjects/mapObjectsState.svelte", () => ({
	getMapObjects: () => scene.objects
}));
vi.mock("@/lib/map/geolocate.svelte", () => ({ setIsLocateFollowing: vi.fn() }));
vi.mock("@/lib/map/loadMapObjects", () => ({
	clearLoadMapObjectsInterval: vi.fn(),
	resetLoadMapObjects: vi.fn()
}));
vi.mock("@/lib/map/mapObjectsInterval", () => ({
	clearUpdateMapObjectsInterval: vi.fn(),
	resetUpdateMapObjectsInterval: vi.fn()
}));
vi.mock("@/lib/map/mapSkew.svelte", () => ({ setSkew: vi.fn() }));
vi.mock("@/lib/mapObjects/updateMapObject", () => ({ updateAllMapObjects: vi.fn() }));
vi.mock("@/lib/services/search.svelte", () => ({ resetSearchedLocation: vi.fn() }));
vi.mock("@/lib/services/userSettings.svelte.js", () => ({
	getUserSettings: vi.fn(),
	updateMapPosition: vi.fn()
}));
vi.mock("@/lib/map/locationEvents", () => ({
	clearPressTimer: vi.fn(),
	resetMapPress: vi.fn(),
	longPressDuration: 500,
	onLocationContext: vi.fn(),
	pressTimer: []
}));
vi.mock("@/lib/ui/quickActions.svelte", () => ({ closeQuickActions: vi.fn() }));

import { updateFeatures } from "./featuresGen.svelte";
import { addMapStyleVersion } from "./map.svelte";
import { onMapStyleLoad } from "./events";

beforeEach(() => {
	vi.clearAllMocks();
	scene.map = { _removed: false } as Map;
	scene.tick.mockResolvedValue(undefined);
});

it("replays unchanged features after Svelte has reset the replacement style's source", async () => {
	const settled = Promise.withResolvers<void>();
	scene.tick.mockReturnValue(settled.promise);
	const replay = onMapStyleLoad({ target: scene.map } as MapStyleLoadEvent);
	expect(updateFeatures).not.toHaveBeenCalled();
	settled.resolve();
	await replay;
	expect(updateFeatures).toHaveBeenCalledExactlyOnceWith(scene.objects);
	expect(addMapStyleVersion).toHaveBeenCalledOnce();
});

it("ignores style changes in preview maps", async () => {
	await onMapStyleLoad({ target: {} } as MapStyleLoadEvent);
	expect(updateFeatures).not.toHaveBeenCalled();
	expect(addMapStyleVersion).not.toHaveBeenCalled();
});

it.each(["removed", "replaced"])("ignores a %s map while awaiting its source", async (change) => {
	const settled = Promise.withResolvers<void>();
	scene.tick.mockReturnValue(settled.promise);
	const replay = onMapStyleLoad({ target: scene.map } as MapStyleLoadEvent);
	if (change === "removed") scene.map!._removed = true;
	else scene.map = undefined;
	settled.resolve();
	await replay;
	expect(updateFeatures).not.toHaveBeenCalled();
	expect(addMapStyleVersion).not.toHaveBeenCalled();
});
