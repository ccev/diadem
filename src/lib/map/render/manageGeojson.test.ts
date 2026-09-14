import { beforeEach, describe, expect, it, vi } from "vitest";
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
		await Promise.resolve();
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
		await Promise.resolve();
		expect(setData).toHaveBeenCalledTimes(2);
		images.add("current");
		current.resolve();
		await current.promise;
		await Promise.resolve();
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
		await Promise.resolve();
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
		await Promise.resolve();
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
			await Promise.resolve();
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
		await Promise.resolve();
		expect(replacement.setData).toHaveBeenCalledExactlyOnceWith({
			type: "FeatureCollection",
			features
		});
	});
});
