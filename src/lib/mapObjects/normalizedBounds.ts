import type { Map, LngLatBounds, LngLatLike } from 'maplibre-gl';
import { getUserSettings } from '@/lib/userSettings.svelte';
import { getMap } from '@/lib/map/map.svelte';

export type Bounds = {
	minLat: number
	maxLat: number
	minLon: number
	maxLon: number
}

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

export function getNormalizedBounds(): Bounds {
	const map = getMap()

	if (!map) {
		return {
			minLat: 0,
			minLon: 0,
			maxLat: 0,
			maxLon: 0
		}
	}

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