import type { Feature, FeatureCollection, Polygon } from "geojson";
import { RADIUS_POKEMON, RADIUS_SCOUT_GMO } from "@/lib/constants";
import { destination, point } from "@turf/turf";
import { Coords, type LatLon } from "@/lib/utils/coordinates";

export type ScoutRequest = {
	coords: LatLon[];
};

export type ScoutGeoProperties = {
	fillColor: string;
	strokeColor: string;
};

type ScoutData = {
	coords: Coords[];
	center: Coords;
	smallPoints: FeatureCollection<Polygon, ScoutGeoProperties>;
	bigPoints: FeatureCollection<Polygon, ScoutGeoProperties>;
};

const defaultScoutData: ScoutData = {
	center: new Coords(0, 0),
	coords: [],
	smallPoints: {
		type: "FeatureCollection",
		features: []
	},
	bigPoints: {
		type: "FeatureCollection",
		features: []
	}
};

let currentScoutData: ScoutData = $state(defaultScoutData);

export function getCurrentScoutData() {
	return currentScoutData;
}

export function setCurrentScoutCoords(coords: Coords[]) {
	currentScoutData.coords = coords;
}

export function setCurrentScoutCenter(center: Coords) {
	currentScoutData.center = center;
}

export function setScoutGeojson(
	smallPoints: Feature<Polygon, ScoutGeoProperties>[],
	bigPoints: Feature<Polygon, ScoutGeoProperties>[]
) {
	currentScoutData.smallPoints.features = smallPoints;
	currentScoutData.bigPoints.features = bigPoints;
}

export function resetCurrentScoutData() {
	currentScoutData = defaultScoutData;
}

export async function startScout() {
	const response = await fetch("/api/scout", {
		method: "POST",
		body: JSON.stringify({ coords: currentScoutData.coords.map((c) => c.internal()) })
	});
	const data = await response.json();
	return !data.error;
}

export async function getScoutQueue() {
	const response = await fetch("/api/scout");
	const data = await response.json();
	return data.result;
}

/**
 * Get scout coordinates, to cover a larger pokemon area
 * Function taken from ReactMap
 */
export function getCoords(center: Coords, size: 0 | 1 | 2) {
	if (size === 0) return [center];

	let distance;

	if (size === 1) {
		distance = RADIUS_POKEMON * 1.732;
	} else if (size === 2) {
		distance = RADIUS_SCOUT_GMO * 1.732;
	} else {
		return [center];
	}

	const start = center.geojson();
	const coords = [center];

	return coords.concat(
		[0, 60, 120, 180, 240, 300].map((bearing) => {
			const coords = destination(point(start), distance / 1000, bearing).geometry.coordinates;
			return Coords.infer(coords);
		})
	);
}
