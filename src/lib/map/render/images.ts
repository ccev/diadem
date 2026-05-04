import type maplibre from "maplibre-gl";
import type { MapObjectIconProperties } from "@/lib/map/render/featureTypes";

const loadedImages: { [key: string]: HTMLImageElement | ImageBitmap | ImageData } = {};

const pendingImageLoads = new WeakMap<maplibre.Map, Map<string, Promise<void>>>();

export function getMapImageId(props: Pick<MapObjectIconProperties, "imageId" | "dimmed">) {
	return props.dimmed ? props.imageId + "/dimmed" : props.imageId;
}

export async function ensureMapImage(map: maplibre.Map, props: MapObjectIconProperties) {
	const imageId = getMapImageId(props);
	if (!imageId || !props.imageUrl || map.hasImage(imageId)) return;

	let pendingForMap = pendingImageLoads.get(map);
	if (!pendingForMap) {
		pendingForMap = new Map<string, Promise<void>>();
		pendingImageLoads.set(map, pendingForMap);
	}
	const pending = pendingForMap.get(imageId);

	if (pending) {
		await pending;
		if (!map.hasImage(imageId)) {
			const imageData = loadedImages[imageId];
			if (imageData) map.addImage(imageId, imageData);
		}
		return;
	}

	const loadPromise = (async () => {
		let imageData = loadedImages[imageId];
		if (!imageData) {
			try {
				const image = await map.loadImage(props.imageUrl);
				imageData = props.dimmed ? getDimmedImage(image.data) : image.data;
				loadedImages[imageId] = imageData;
			} catch (e) {
				// URL may not be directly loadable (e.g. virtual URL)
			}
		}

		if (imageData && !map.hasImage(imageId)) {
			map.addImage(imageId, imageData);
		}
	})();

	pendingForMap.set(imageId, loadPromise);
	try {
		await loadPromise;
	} finally {
		pendingForMap.delete(imageId);
	}
}

export async function ensureMapImages(map: maplibre.Map, features: MapObjectIconProperties[]) {
	const unique = [...new Map(features.map((f) => [getMapImageId(f), f])).values()];
	await Promise.all(unique.map((props) => ensureMapImage(map, props)));
}

function getDimmedImage(
	image: HTMLImageElement | ImageBitmap
): ImageData | HTMLImageElement | ImageBitmap {
	const canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;

	const context = canvas.getContext("2d");
	if (!context) return image;

	context.filter = "grayscale(80%)";

	context.drawImage(image, 0, 0);
	return context.getImageData(0, 0, canvas.width, canvas.height);
}
