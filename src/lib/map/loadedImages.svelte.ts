let loadedImages: { [key: string]: HTMLImageElement | ImageBitmap } = {};

export function getLoadedImages() {
	return loadedImages;
}

export function setLoadedImage(key: string, image: HTMLImageElement | ImageBitmap) {
	loadedImages[key] = image;
}
