import type { FeatureCollection, Point, Polygon } from 'geojson';
import { type Feature, type IconProperties } from '@/lib/map/featuresGen.svelte';
import { getMap } from '@/lib/map/map.svelte';
import type { S2CellFeature, S2CellProperties } from '@/lib/mapObjects/s2cells.svelte.js';
import { getLoadedImages, setLoadedImage } from '@/lib/map/loadedImages.svelte';

let mapObjectsGeoJson: FeatureCollection<Point, IconProperties> = {
	type: 'FeatureCollection',
	features: []
};

let sessionImageUrls: string[] = [];

export function updateMapObjectsGeoJson(features: Feature[]) {
	mapObjectsGeoJson = { type: 'FeatureCollection', features };
	getMap()?.getSource('mapObjects')?.setData(mapObjectsGeoJson);
	Promise.all(
		mapObjectsGeoJson.features.map((f) => {
			return addMapImage(f.properties?.imageUrl);
		})
	).then(() => {
		getMap()?.getSource('mapObjects')?.setData(mapObjectsGeoJson);
	});
}

export function clearSessionImageUrls() {
	sessionImageUrls = []
}

export function getMapObjectsGeoJson() {
	return mapObjectsGeoJson;
}

async function addMapImage(url: string) {
	const map = getMap();
	if (!map) return;

	if (sessionImageUrls.includes(url)) return;
	sessionImageUrls.push(url);

	let imageData = getLoadedImages()[url];
	if (!imageData) {
		const image = await map.loadImage(url);
		imageData = image.data;
		setLoadedImage(url, imageData)
	}

	if (!map.hasImage(url)) {
		map.addImage(url, imageData);
	}
}