import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";

export function buildSpatialFilter(
	polygon: PermittedPolygon,
	bounds: Bounds,
	pointExpr = "Point(lon, lat)"
): { sql: string; values: any[] } {
	if (polygon) {
		return {
			sql: `ST_Contains(ST_GeomFromGeoJSON(?), ${pointExpr})`,
			values: [JSON.stringify(polygon.geometry)]
		};
	}
	return {
		sql: "lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?",
		values: [bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]
	};
}
