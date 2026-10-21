import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { r1, s1, s2 } from "s2js";

export function parseS2CellId(id: string, level?: number): bigint | undefined {
	if (!/^[1-9]\d{0,19}$/.test(id)) return;
	const cell = BigInt(id);
	if (cell > (1n << 64n) - 1n || !s2.cellid.valid(cell)) return;
	if (level !== undefined && s2.cellid.level(cell) !== level) return;
	return cell;
}

export function getS2CellCenter(id: bigint) {
	const center = s2.cellid.latLng(id);
	return {
		lat: s1.angle.degrees(center.lat),
		lon: s1.angle.degrees(center.lng)
	};
}

export function getS2CellsInBounds(
	bounds: Bounds,
	level: number,
	maxCells = 5_000
): bigint[] | undefined {
	const southwest = s2.LatLng.fromDegrees(bounds.minLat, bounds.minLon).normalized();
	const northeast = s2.LatLng.fromDegrees(bounds.maxLat, bounds.maxLon).normalized();

	let longitudes: s1.Interval;
	if (bounds.maxLon - bounds.minLon >= 360) {
		longitudes = s1.Interval.fullInterval();
	} else {
		longitudes = s1.Interval.fromEndpoints(southwest.lng, northeast.lng);
	}
	const region = new s2.Rect(new r1.Interval(southwest.lat, northeast.lat), longitudes);
	const cells = new s2.RegionCoverer({ maxLevel: level, maxCells }).covering(region);

	// Expanding to a fixed level can exceed maxCells. Allow a loose overrun, but
	// reject huge expansions before allocating their cells.
	const expansionLimit = maxCells * 4;
	let count = 0;
	for (const id of cells) {
		count += 4 ** (level - s2.cellid.level(id));
		if (count > expansionLimit) return;
	}

	cells.denormalize(level, 1);
	return Array.from(cells).filter((id) => region.intersectsCell(s2.Cell.fromCellID(id)));
}
