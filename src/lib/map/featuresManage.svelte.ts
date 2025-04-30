import type { FeatureCollection, Point } from 'geojson';
import { type Feature, type IconProperties } from '@/lib/map/featuresGen.svelte';
import { getMap } from '@/lib/map/map.svelte';
import { getLoadedImages } from '@/lib/utils.svelte';

let mapObjectsGeoJson: FeatureCollection<Point, IconProperties> = $state({
	type: 'FeatureCollection',
	features: []
});
let sessionImageUrls: string[] = [];

export function updateMapObjectsGeoJson(features: Feature[]) {
	mapObjectsGeoJson = { type: 'FeatureCollection', features };
	// @ts-ignore
	// getMap()?.getSource('mapObjects')?.setData(mapObjectsGeoJson);
	Promise.all(
		mapObjectsGeoJson.features.map((f) => {
			return addMapImage(f.properties?.imageUrl);
		})
	).then();
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
		getLoadedImages()[url] = imageData;
	}

	map.addImage(url, imageData);
}