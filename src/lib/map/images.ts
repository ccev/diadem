import type maplibre from "maplibre-gl";
import { getLoadedImages, setLoadedImage } from "@/lib/map/loadedImages.svelte";

export async function ensureMapImage(map: maplibre.Map, url: string) {
	if (!url) return;
	if (map.hasImage(url)) return;

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
}

export async function ensureMapImages(map: maplibre.Map, urls: string[]) {
	await Promise.all(
		[...new Set(urls.filter(Boolean))].map((url) => ensureMapImage(map, url))
	);
}
