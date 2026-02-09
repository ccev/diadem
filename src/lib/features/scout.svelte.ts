import type { Feature, FeatureCollection, Polygon } from "geojson";
import { RADIUS_POKEMON, RADIUS_SCOUT_GMO } from "@/lib/constants";
import { destination, point } from "@turf/turf";
import { Coords, type LatLon } from "@/lib/utils/coordinates";
import { circle as makeCrircle } from "@turf/turf";

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

export function getScoutGeojsons(coords: Coords[], size: 0 | 1 | 2) {
	const smallPoints: Feature<Polygon, ScoutGeoProperties>[] = [];
	const bigPoints: Feature<Polygon, ScoutGeoProperties>[] = [];
	coords.forEach((c) => {
		const smallCircle = makeCrircle([c.lon, c.lat], RADIUS_POKEMON / 1000) as Feature<
			Polygon,
			ScoutGeoProperties
		>;
		smallCircle.properties.fillColor = "#DAB2FFFF";
		smallCircle.properties.strokeColor = "#DAB2FFFF";
		smallPoints.push(smallCircle);

		if (size === 1 && bigPoints.length > 0) return; // only draw the middle circle in M

		const bigCircle = makeCrircle([c.lon, c.lat], RADIUS_SCOUT_GMO / 1000) as Feature<
			Polygon,
			ScoutGeoProperties
		>;
		bigCircle.properties.fillColor = "#DFF2FEFF";
		bigCircle.properties.strokeColor = "#DFF2FEFF";
		bigPoints.push(bigCircle);
	});

	console.log(smallPoints)
	return [ smallPoints, bigPoints ]
}
