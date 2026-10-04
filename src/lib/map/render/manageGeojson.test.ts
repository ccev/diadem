import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { FeatureTypes, type MapObjectIconFeature } from "./featureTypes";

const setData = vi.hoisted(() => vi.fn());
const scene = vi.hoisted(() => ({
	map: undefined as MapLibreMap | undefined,
	source: undefined as { setData: ReturnType<typeof vi.fn> } | undefined,
	sourceThrows: false
}));
vi.mock("@/lib/map/map.svelte.js", () => ({ getMap: () => scene.map }));
vi.mock("@/lib/map/render/images", async (importOriginal) => ({
	...(await importOriginal<typeof import("./images")>()),
	ensureMapImage: vi.fn()
}));

import { ensureMapImage } from "./images";
import { updateMapObjectsGeoJson } from "./manageGeojson";

function icon(id: string): MapObjectIconFeature {
	return {
		type: "Feature",
		id,
		geometry: { type: "Point", coordinates: [10, 53] },
		properties: {
			id,
			type: FeatureTypes.ICON,
			imageId: id,
			imageUrl: `/${id}.png`,
			imageSize: 1,
			selectedScale: 1,
			dimmed: false,
			expires: null
		}
	};
}

let images: Set<string>;
beforeEach(() => {
	vi.useFakeTimers();
	const registered = new Set<string>();
	images = registered;
	scene.source = { setData };
	scene.sourceThrows = false;
	scene.map = {
		hasImage: (id: string) => registered.has(id),
		getSource: () => {
			if (scene.sourceThrows) throw new Error("style not ready");
			return scene.source;
		}
	} as unknown as MapLibreMap;
	setData.mockReset();
	vi.mocked(ensureMapImage).mockReset();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("map image publication versions", () => {
	it("only publishes the latest callback when data is republished during an image load", async () => {
		const load = Promise.withResolvers<void>();
		vi.mocked(ensureMapImage).mockReturnValue(load.promise);
		const features = [icon("pending")];
		updateMapObjectsGeoJson(features);
		updateMapObjectsGeoJson(features);
		expect(ensureMapImage).toHaveBeenCalledTimes(2);
		images.add("pending");
		load.resolve();
		await load.promise;
		await vi.advanceTimersByTimeAsync(32);
		expect(setData).toHaveBeenCalledTimes(3);
		expect(setData).toHaveBeenLastCalledWith({
			type: "FeatureCollection",
			features
		});
	});

	it("ignores obsolete image completions without delaying the current image", async () => {
		const old = Promise.withResolvers<void>();
		const current = Promise.withResolvers<void>();
		vi.mocked(ensureMapImage).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
		updateMapObjectsGeoJson([icon("old")]);
		const features = [icon("current")];
		updateMapObjectsGeoJson(features);
		images.add("old");
		old.resolve();
		await old.promise;
		await vi.advanceTimersByTimeAsync(32);
		expect(setData).toHaveBeenCalledTimes(2);
		images.add("current");
		current.resolve();
		await current.promise;
		await vi.advanceTimersByTimeAsync(32);
		expect(setData).toHaveBeenCalledTimes(3);
		expect(setData).toHaveBeenLastCalledWith({
			type: "FeatureCollection",
			features
		});
	});

	it("does not repeat a publication that already contains the newly registered image", async () => {
		const load = Promise.withResolvers<void>();
		vi.mocked(ensureMapImage).mockReturnValue(load.promise);
		const features = [icon("ready")];
		updateMapObjectsGeoJson(features);
		images.add("ready");
		updateMapObjectsGeoJson(features);
		load.resolve();
		await load.promise;
		await vi.advanceTimersByTimeAsync(32);
		expect(ensureMapImage).toHaveBeenCalledOnce();
		expect(setData).toHaveBeenCalledTimes(2);
		expect(setData).toHaveBeenLastCalledWith({
			type: "FeatureCollection",
			features
		});
	});

	it("does not upload stale data after the map is cleared", async () => {
		const load = Promise.withResolvers<void>();
		vi.mocked(ensureMapImage).mockReturnValue(load.promise);
		updateMapObjectsGeoJson([icon("removed")]);
		updateMapObjectsGeoJson([]);
		images.add("removed");
		load.resolve();
		await load.promise;
		await vi.advanceTimersByTimeAsync(32);
		expect(setData).toHaveBeenCalledTimes(2);
		expect(setData).toHaveBeenLastCalledWith({
			type: "FeatureCollection",
			features: []
		});
	});

	it.each([false, true])(
		"replays the latest collection after a missing source recovers (lookup threw: %s)",
		async (throws) => {
			const old = Promise.withResolvers<void>();
			vi.mocked(ensureMapImage).mockReturnValue(old.promise);
			updateMapObjectsGeoJson([icon("old")]);
			scene.source = undefined;
			scene.sourceThrows = throws;
			images.add("ready");
			const features = [icon("ready")];
			updateMapObjectsGeoJson(features);
			expect(setData).toHaveBeenCalledOnce();

			const restored = { setData: vi.fn() };
			scene.source = restored;
			scene.sourceThrows = false;
			images.add("old");
			old.resolve();
			await old.promise;
			await vi.advanceTimersByTimeAsync(32);
			expect(restored.setData).toHaveBeenCalledExactlyOnceWith({
				type: "FeatureCollection",
				features
			});
		}
	);

	it("does not treat publication to an old source as publication to its replacement", async () => {
		const old = Promise.withResolvers<void>();
		vi.mocked(ensureMapImage).mockReturnValue(old.promise);
		updateMapObjectsGeoJson([icon("old")]);
		images.add("ready");
		const features = [icon("ready")];
		updateMapObjectsGeoJson(features);
		const replacement = { setData: vi.fn() };
		scene.source = replacement;
		old.resolve();
		await old.promise;
		await vi.advanceTimersByTimeAsync(32);
		expect(replacement.setData).toHaveBeenCalledExactlyOnceWith({
			type: "FeatureCollection",
			features
		});
	});
});

it("batches icon completions while allowing later icons to render", async () => {
	const loads = new Map<string, () => void>();
	vi.mocked(ensureMapImage).mockImplementation(
		(_map, props) =>
			new Promise<void>((resolve) => {
				loads.set(props.imageId, () => {
					images.add(props.imageId);
					resolve();
				});
			})
	);
	const features = Array.from({ length: 200 }, (_, i) => icon(String(i)));
	updateMapObjectsGeoJson(features);
	expect(setData).toHaveBeenCalledOnce();
	for (let i = 0; i < 100; i++) loads.get(String(i))!();
	await vi.advanceTimersByTimeAsync(32);
	expect(setData).toHaveBeenCalledTimes(2);
	expect(setData.mock.lastCall![0].features).toHaveLength(100);
	for (let i = 100; i < 200; i++) loads.get(String(i))!();
	await vi.advanceTimersByTimeAsync(32);
	expect(setData).toHaveBeenCalledTimes(3);
	expect(setData.mock.lastCall![0].features).toHaveLength(200);
});

it.each(["removed", "replaced"])(
	"does not publish a scheduled batch to a %s map",
	async (change) => {
		const load = Promise.withResolvers<void>();
		vi.mocked(ensureMapImage).mockReturnValue(load.promise);
		updateMapObjectsGeoJson([icon("a")]);
		images.add("a");
		load.resolve();
		await vi.advanceTimersByTimeAsync(1);
		if (change === "removed") Object.assign(scene.map!, { _removed: true });
		else scene.map = undefined;
		await vi.advanceTimersByTimeAsync(32);
		expect(setData).toHaveBeenCalledOnce();
	}
);

it("does not repeat a scheduled batch after a newer publication already includes its icons", async () => {
	const load = Promise.withResolvers<void>();
	vi.mocked(ensureMapImage).mockReturnValue(load.promise);
	const features = [icon("ready")];
	updateMapObjectsGeoJson(features);
	images.add("ready");
	load.resolve();
	await vi.advanceTimersByTimeAsync(1);
	updateMapObjectsGeoJson(features);
	await vi.advanceTimersByTimeAsync(32);
	expect(setData).toHaveBeenCalledTimes(2);
});
