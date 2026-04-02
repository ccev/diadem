import type maplibre from "maplibre-gl";
import { getLoadedImages, setLoadedImage } from "@/lib/map/loadedImages.svelte";

const pendingImageLoads = new WeakMap<maplibre.Map, Map<string, Promise<void>>>();

function getPendingMap(map: maplibre.Map) {
	let pendingForMap = pendingImageLoads.get(map);
	if (!pendingForMap) {
		pendingForMap = new Map<string, Promise<void>>();
		pendingImageLoads.set(map, pendingForMap);
	}
	return pendingForMap;
}

export async function ensureMapImage(map: maplibre.Map, url: string) {
	if (!url) return;
	if (map.hasImage(url)) return;

	const pendingForMap = getPendingMap(map);
	const pending = pendingForMap.get(url);
	if (pending) {
		await pending;
		if (!map.hasImage(url)) {
			const imageData = getLoadedImages()[url];
			if (imageData) map.addImage(url, imageData);
		}
		return;
	}

	const loadPromise = (async () => {
		let imageData = getLoadedImages()[url];
		if (!imageData) {
			try {
				const image = await map.loadImage(url);
				imageData = image.data;
				setLoadedImage(url, imageData);
			} catch (e) {
				// URL may not be directly loadable (e.g. virtual URL)
			}
		}

		if (imageData && !map.hasImage(url)) {
			map.addImage(url, imageData);
		}
	})();

	pendingForMap.set(url, loadPromise);
	try {
		await loadPromise;
	} finally {
		pendingForMap.delete(url);
	}
}

export async function ensureMapImages(map: maplibre.Map, urls: string[]) {
	await Promise.all([...new Set(urls.filter(Boolean))].map((url) => ensureMapImage(map, url)));
}
