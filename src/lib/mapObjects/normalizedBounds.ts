import type { Map, LngLatBounds, LngLatLike } from 'maplibre-gl';
import { getUserSettings } from '@/lib/userSettings.svelte';

function applyPadding(map: Map, coordinates: LngLatLike, method: "sub"|"add") {
	let point = map.project(coordinates)

	let x = point.x
	let y = point.y

	const padding = getUserSettings().loadMapObjectsPadding
	if (method === "add") {
		x += padding
		y -= padding
	} else {
		x -= padding
		y += padding
	}

	return map.unproject([x, y])
}

export function getNormalizedBounds(map: Map) {
	const bounds = map.getBounds()

	const minCoords = applyPadding(map, bounds.getSouthWest(), "sub")
	const maxCoords = applyPadding(map, bounds.getNorthEast(), "add")

	return {
		minLat: minCoords.lat,
		minLon: minCoords.lng,
		maxLat: maxCoords.lat,
		maxLon: maxCoords.lng
	}
}