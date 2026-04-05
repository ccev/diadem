import type maplibre from "maplibre-gl";
import type { MapObjectIconProperties } from "@/lib/map/render/featureTypes";

const loadedImages: { [key: string]: HTMLImageElement | ImageBitmap } = {};

const pendingImageLoads = new WeakMap<maplibre.Map, Map<string, Promise<void>>>();

export async function ensureMapImage(map: maplibre.Map, props: MapObjectIconProperties) {
	if (!props.imageId || !props.imageUrl || map.hasImage(props.imageId)) return;

	let pendingForMap = pendingImageLoads.get(map);
	if (!pendingForMap) {
		pendingForMap = new Map<string, Promise<void>>();
		pendingImageLoads.set(map, pendingForMap);
	}
	const pending = pendingForMap.get(props.imageId);

	if (pending) {
		await pending;
		if (!map.hasImage(props.imageId)) {
			const imageData = loadedImages[props.imageId];
			if (imageData) map.addImage(props.imageId, imageData);
		}
		return;
	}

	const loadPromise = (async () => {
		let imageData = loadedImages[props.imageId];
		if (!imageData) {
			try {
				const image = await map.loadImage(props.imageUrl);
				imageData = image.data;
				loadedImages[props.imageId] = imageData;
			} catch (e) {
				// URL may not be directly loadable (e.g. virtual URL)
			}
		}

		if (imageData && !map.hasImage(props.imageId)) {
			map.addImage(props.imageId, imageData);
		}
	})();

	pendingForMap.set(props.imageId, loadPromise);
	try {
		await loadPromise;
	} finally {
		pendingForMap.delete(props.imageId);
	}
}

export async function ensureMapImages(map: maplibre.Map, features: MapObjectIconProperties[]) {
	const unique = [...new Map(features.map((f) => [f.imageId, f])).values()];
	await Promise.all(unique.map((props) => ensureMapImage(map, props)));
}
