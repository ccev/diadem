import type maplibre from "maplibre-gl";
import { getLoadedImages, setLoadedImage } from "@/lib/map/loadedImages.svelte";

const pendingImageLoads = new Map<string, Promise<void>>();

export async function ensureMapImage(map: maplibre.Map, url: string) {
	if (!url) return;
	if (map.hasImage(url)) return;

	const pending = pendingImageLoads.get(url);
	if (pending) {
		await pending;
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

	pendingImageLoads.set(url, loadPromise);
	try {
		await loadPromise;
	} finally {
		pendingImageLoads.delete(url);
	}
}

export async function ensureMapImages(map: maplibre.Map, urls: string[]) {
	await Promise.all([...new Set(urls.filter(Boolean))].map((url) => ensureMapImage(map, url)));
}
