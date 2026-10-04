import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";

export function buildSpatialFilter(
	polygon: PermittedPolygon,
	bounds: Bounds,
	pointExpr = "Point(lon, lat)"
): { sql: string; values: unknown[] } {
	let sql = "lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?";
	const values: unknown[] = [bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon];

	if (polygon) {
		// Keep indexed bounds as a prefilter; containment still enforces the exact allowed area.
		sql += ` AND ST_Contains(ST_GeomFromGeoJSON(?), ${pointExpr})`;
		values.push(JSON.stringify(polygon.geometry));
	}

	return { sql, values };
}
