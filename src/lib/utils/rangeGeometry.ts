import { RADIUS_POKEMON } from "@/lib/constants";
import type { Feature, Polygon } from "geojson";

// re-implementing the range function that's actually used by the game

export const RANGE_EARTH_RADIUS_METERS = 6367000;
const RADIANS = Math.PI / 180;

export type RangePosition = readonly [longitude: number, latitude: number];

function wrapLongitude(longitude: number) {
	return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

export function rangeDistanceMeters(from: RangePosition, to: RangePosition) {
	const lat1 = from[1] * RADIANS;
	const lat2 = to[1] * RADIANS;

	const deltaLon = (to[0] - from[0]) * RADIANS;
	const a = Math.min(
		1,
		Math.max(
			0,
			Math.sin((lat2 - lat1) / 2) ** 2 +
				Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2
		)
	);
	return 2 * RANGE_EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinRange(
	center: RangePosition,
	position: RangePosition,
	radiusMeters = RADIUS_POKEMON
) {
	return rangeDistanceMeters(center, position) <= radiusMeters;
}

export function rangeDestination(
	center: RangePosition,
	distanceMeters: number,
	bearingDegrees: number
): [number, number] {
	const longitude = center[0] * RADIANS;
	const latitude = center[1] * RADIANS;
	const bearing = bearingDegrees * RADIANS;
	const angle = distanceMeters / RANGE_EARTH_RADIUS_METERS;
	const sinLat = Math.sin(latitude);
	const cosLat = Math.cos(latitude);
	const sinLon = Math.sin(longitude);
	const cosLon = Math.cos(longitude);
	const north = Math.sin(angle) * Math.cos(bearing);
	const east = Math.sin(angle) * Math.sin(bearing);
	const radial = Math.cos(angle);

	const x = radial * cosLat * cosLon - north * sinLat * cosLon - east * sinLon;
	const y = radial * cosLat * sinLon - north * sinLat * sinLon + east * cosLon;
	const z = radial * sinLat + north * cosLat;
	return [wrapLongitude(Math.atan2(y, x) / RADIANS), Math.atan2(z, Math.hypot(x, y)) / RADIANS];
}

export function rangeCircle<P = Record<string, never>>(
	center: RangePosition,
	radiusMeters: number,
	options: { steps?: number; properties?: P } = {}
): Feature<Polygon, P> {
	const steps = options.steps ?? 64;
	if (!Number.isInteger(steps) || steps < 4) throw new RangeError("At least four steps required");
	if (
		!Number.isFinite(radiusMeters) ||
		radiusMeters < 0 ||
		radiusMeters >= (Math.PI * RANGE_EARTH_RADIUS_METERS) / 2
	) {
		throw new RangeError("Range radius must be nonnegative and smaller than a hemisphere");
	}
	const coordinates: [number, number][] = [];
	for (let i = 0; i < steps; i++) {
		const vertex = rangeDestination(center, radiusMeters, (-360 * i) / steps);
		const previousLongitude = coordinates.at(-1)?.[0] ?? center[0];
		vertex[0] += 360 * Math.round((previousLongitude - vertex[0]) / 360);
		coordinates.push(vertex);
	}
	const first = coordinates[0];
	const closingLongitude = first[0] + 360 * Math.round((coordinates.at(-1)![0] - first[0]) / 360);
	if (closingLongitude !== first[0]) {
		const pole = center[1] >= 0 ? 90 : -90;
		coordinates.push([closingLongitude, first[1]], [closingLongitude, pole]);
		coordinates.push([(closingLongitude + first[0]) / 2, pole], [first[0], pole]);
	}
	coordinates.push([...first]);
	return {
		type: "Feature",
		properties: options.properties ?? ({} as P),
		geometry: { type: "Polygon", coordinates: [coordinates] }
	};
}

export function rangeBounds(center: RangePosition, radiusMeters: number) {
	const angle = radiusMeters / RANGE_EARTH_RADIUS_METERS;
	const latitude = center[1] * RADIANS;
	const longitude = wrapLongitude(center[0]);
	const minLat = Math.max(-90, (latitude - angle) / RADIANS);
	const maxLat = Math.min(90, (latitude + angle) / RADIANS);
	const reachesPole = minLat <= -90 || maxLat >= 90;
	const longitudeDelta = reachesPole
		? 180
		: Math.asin(Math.min(1, Math.sin(angle) / Math.cos(latitude))) / RADIANS;
	const crossesAntimeridian = longitude - longitudeDelta < -180 || longitude + longitudeDelta > 180;
	
	return {
		minLat,
		maxLat,
		minLon: reachesPole || crossesAntimeridian ? -180 : longitude - longitudeDelta,
		maxLon: reachesPole || crossesAntimeridian ? 180 : longitude + longitudeDelta
	};
}
