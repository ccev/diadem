import { type Map, type LngLatLike, type LngLat } from "maplibre-gl";
import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
import { getMap } from "@/lib/map/map.svelte";
import * as turf from "@turf/turf";

export type Bounds = {
	minLat: number;
	maxLat: number;
	minLon: number;
	maxLon: number;
};

const emptyBounds: Bounds = {
	minLat: 0,
	minLon: 0,
	maxLat: 0,
	maxLon: 0
};

function applyPadding(map: Map, coordinates: LngLatLike, method: "sub" | "add", padding: number) {
	let point = map.project(coordinates);

	let x = point.x;
	let y = point.y;

	if (method === "add") {
		x += padding;
		y -= padding;
	} else {
		x -= padding;
		y += padding;
	}

	return map.unproject([x, y]);
}

export function getBounds(
	normalized: boolean = true,
	padding: number | undefined = undefined
): Bounds {
	const map = getMap();

	if (!map) return emptyBounds

	const bounds = map.getBounds();

	let minCoords: LngLat;
	let maxCoords: LngLat;

	if (normalized) {
		if (!padding) {
			padding = getUserSettings().loadMapObjectsPadding;
		}
		minCoords = applyPadding(map, bounds.getSouthWest(), "sub", padding);
		maxCoords = applyPadding(map, bounds.getNorthEast(), "add", padding);
	} else {
		minCoords = bounds.getSouthWest();
		maxCoords = bounds.getNorthEast();
	}

	return {
		minLat: minCoords.lat,
		minLon: minCoords.lng,
		maxLat: maxCoords.lat,
		maxLon: maxCoords.lng
	};
}

export function getFixedBounds(km: number): Bounds {
	const map = getMap();
	if (!map) return emptyBounds

	const mapCenter = map.getCenter();
	const center = turf.point([mapCenter.lng, mapCenter.lat]);
	const square = turf.buffer(center, km / 2, {
		units: "kilometers",
		steps: 4
	});

	if (!square) return emptyBounds

	const bbox = turf.bbox(square);

	// const center = map.project(map.getCenter());
	//
	// const topRight: [number, number] = [center.x + width / 2, center.y - height / 2];
	// const bottomLeft: [number, number] = [center.x - width / 2, center.y + height / 2];
	//
	// const maxCoords = map.unproject(topRight);
	// const minCoords = map.unproject(bottomLeft);

	return {
		minLat: bbox[1],
		minLon: bbox[0],
		maxLat: bbox[3],
		maxLon: bbox[2]
	};
}
