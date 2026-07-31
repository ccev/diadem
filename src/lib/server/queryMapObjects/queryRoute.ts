import type { FilterRoute } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import {
	DbMapObjectQuery,
	type MapObjectResponse
} from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { RouteData, RouteWaypoint } from "@/lib/types/mapObjectData/route";
import { getRouteCoordinates } from "@/lib/utils/routeUtils";
import { bboxPolygon, booleanIntersects, lineString } from "@turf/turf";

const MAX_ROUTE_REACH_METERS = 25_000;
const ROUTE_DISTANCE_FACTOR = 1.1;
const ROUTE_DISTANCE_MARGIN_METERS = 100;
const METERS_PER_LATITUDE_DEGREE = 110_574;
const METERS_PER_LONGITUDE_DEGREE = 111_320;
const CANDIDATE_PAGE_SIZE = 2_000;

export class RouteQuery extends DbMapObjectQuery<RouteData, FilterRoute> {
	protected readonly type = MapObjectType.ROUTE;
	protected readonly table = "route AS route_data";
	protected readonly fields = [
		"route_data.id",
		"route_data.start_lat AS lat",
		"route_data.start_lon AS lon",
		"route_data.name",
		"route_data.shortcode",
		"route_data.description",
		"route_data.distance_meters",
		"route_data.duration_seconds",
		"route_data.start_fort_id",
		"route_start.name AS start_name",
		"route_data.start_image",
		"route_data.start_lat",
		"route_data.start_lon",
		"route_data.end_fort_id",
		"route_end.name AS end_name",
		"route_data.end_image",
		"route_data.end_lat",
		"route_data.end_lon",
		"route_data.image",
		"route_data.image_border_color",
		"route_data.reversible",
		"route_data.tags",
		"route_data.type AS route_type",
		"route_data.updated",
		"route_data.version",
		"route_data.waypoints"
	];
	protected readonly limit = requestLimits[MapObjectType.ROUTE];
	protected readonly idColumn = "route_data.id";
	protected readonly updatedColumn = "route_data.updated";
	// Golbat's newer route table and older fort tables can use different utf8mb4 collations.
	protected readonly joins =
		"LEFT JOIN pokestop AS route_start ON route_start.id = route_data.start_fort_id COLLATE utf8mb4_general_ci " +
		"LEFT JOIN pokestop AS route_end ON route_end.id = route_data.end_fort_id COLLATE utf8mb4_general_ci";

	async query(
		bounds: Bounds,
		_filter: FilterRoute | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number
	): Promise<MapObjectResponse<MinMapObject<RouteData>>> {
		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		const target =
			polygon ?? bboxPolygon([bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat]);
		const outerLatPadding = MAX_ROUTE_REACH_METERS / METERS_PER_LATITUDE_DEGREE;
		const maxAbsoluteLatitude = Math.min(
			89,
			Math.max(Math.abs(bounds.minLat), Math.abs(bounds.maxLat)) + outerLatPadding
		);
		const metersPerLongitudeDegree =
			METERS_PER_LONGITUDE_DEGREE * Math.max(Math.cos((maxAbsoluteLatitude * Math.PI) / 180), 0.01);
		const outerLonPadding = MAX_ROUTE_REACH_METERS / metersPerLongitudeDegree;

		const baseWhere = [
			"route_data.start_lat BETWEEN ? AND ?",
			"route_data.start_lon BETWEEN ? AND ?",
			"route_data.start_lat BETWEEN ? - ((route_data.distance_meters * ? + ?) / ?) AND ? + ((route_data.distance_meters * ? + ?) / ?)",
			"route_data.start_lon BETWEEN ? - ((route_data.distance_meters * ? + ?) / ?) AND ? + ((route_data.distance_meters * ? + ?) / ?)"
		];
		const baseValues: unknown[] = [
			Math.max(-90, bounds.minLat - outerLatPadding),
			Math.min(90, bounds.maxLat + outerLatPadding),
			bounds.minLon - outerLonPadding,
			bounds.maxLon + outerLonPadding,
			bounds.minLat,
			ROUTE_DISTANCE_FACTOR,
			ROUTE_DISTANCE_MARGIN_METERS,
			METERS_PER_LATITUDE_DEGREE,
			bounds.maxLat,
			ROUTE_DISTANCE_FACTOR,
			ROUTE_DISTANCE_MARGIN_METERS,
			METERS_PER_LATITUDE_DEGREE,
			bounds.minLon,
			ROUTE_DISTANCE_FACTOR,
			ROUTE_DISTANCE_MARGIN_METERS,
			metersPerLongitudeDegree,
			bounds.maxLon,
			ROUTE_DISTANCE_FACTOR,
			ROUTE_DISTANCE_MARGIN_METERS,
			metersPerLongitudeDegree
		];
		if (since !== undefined) {
			baseWhere.push(`${this.updatedColumn} > ?`);
			baseValues.push(since);
		}

		let cursor: Pick<RouteData, "start_lat" | "start_lon" | "id"> | undefined;
		let examined = 0;
		const matches: MinMapObject<RouteData>[] = [];

		while (true) {
			const pageSize = Math.min(CANDIDATE_PAGE_SIZE, actualLimit + 1 - examined);
			const where = [...baseWhere];
			const values = [...baseValues];
			if (cursor) {
				where.push(
					"(route_data.start_lat > ? OR (route_data.start_lat = ? AND (route_data.start_lon > ? OR (route_data.start_lon = ? AND route_data.id > ?))))"
				);
				values.push(
					cursor.start_lat,
					cursor.start_lat,
					cursor.start_lon,
					cursor.start_lon,
					cursor.id
				);
			}

			const sql =
				this.buildSelectFrom() +
				` WHERE ${where.join(" AND ")} ORDER BY route_data.start_lat, route_data.start_lon, route_data.id LIMIT ${pageSize}`;
			const candidates = await this.executeQuery<MinMapObject<RouteData>[]>(sql, values);
			examined += candidates.length;

			for (const candidate of candidates) {
				this.prepare(candidate);
				const coordinates = getRouteCoordinates(candidate);
				if (coordinates.length >= 2 && booleanIntersects(lineString(coordinates), target)) {
					matches.push(candidate);
					if (matches.length > actualLimit) {
						return { data: [], examined: actualLimit, limitReached: true };
					}
				}
			}
			if (examined > actualLimit) {
				return { data: [], examined: actualLimit, limitReached: true };
			}

			if (candidates.length < pageSize) break;
			const last = candidates.at(-1);
			if (!last) break;
			cursor = last;
		}

		return { data: matches, examined };
	}

	prepare(data: MinMapObject<RouteData>): void {
		data.reversible = Boolean(data.reversible);
		data.tags = this.parseJsonArray<string>(data.tags);
		data.waypoints = this.parseJsonArray<RouteWaypoint>(data.waypoints).filter(
			(waypoint) => Number.isFinite(waypoint.lat_degrees) && Number.isFinite(waypoint.lng_degrees)
		);
	}

	private parseJsonArray<T>(value: unknown): T[] {
		if (Array.isArray(value)) return value as T[];
		if (typeof value !== "string" || !value) return [];

		try {
			const parsed: unknown = JSON.parse(value);
			return Array.isArray(parsed) ? (parsed as T[]) : [];
		} catch {
			return [];
		}
	}
}
