import type { FilterRoute } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import {
	DbMapObjectQuery,
	type MapObjectResponse
} from "@/lib/server/queryMapObjects/MapObjectQuery";
import { normalizeRouteRow, type RawRouteData } from "@/lib/server/queryMapObjects/routeRow";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { getRouteCoordinates } from "@/lib/utils/routeUtils";
import { bboxPolygon, booleanIntersects, lineString } from "@turf/turf";

const MAX_ROUTE_REACH_METERS = 25_000;
const ROUTE_DISTANCE_FACTOR = 1.1;
const ROUTE_DISTANCE_MARGIN_METERS = 100;
const METERS_PER_LATITUDE_DEGREE = 110_574;
const METERS_PER_LONGITUDE_DEGREE = 111_320;

type EndpointPosition = "start" | "end";

function getEndpointSql(position: EndpointPosition) {
	const pokestop = `route_${position}_pokestop`;
	const gym = `route_${position}_gym`;
	const activePokestop = `${pokestop}.id IS NOT NULL AND ${pokestop}.deleted = 0`;
	const activeGym = `${gym}.id IS NOT NULL AND ${gym}.deleted = 0`;

	return {
		fields: [
			`route_data.${position}_fort_id`,
			`CASE WHEN ${activeGym} THEN 'gym' WHEN ${activePokestop} THEN 'pokestop' WHEN ${gym}.id IS NOT NULL THEN 'gym' ELSE 'pokestop' END AS ${position}_fort_type`,
			`COALESCE(IF(${gym}.deleted = 0, ${gym}.name, NULL), IF(${pokestop}.deleted = 0, ${pokestop}.name, NULL), ${gym}.name, ${pokestop}.name) AS ${position}_name`,
			`route_data.${position}_image`,
			`route_data.${position}_lat`,
			`route_data.${position}_lon`,
			`${gym}.team_id AS ${position}_team_id`,
			`${gym}.availble_slots AS ${position}_available_slots`,
			`${gym}.in_battle AS ${position}_in_battle`,
			`${gym}.ex_raid_eligible AS ${position}_ex_raid_eligible`,
			`CASE WHEN ${activeGym} THEN ${gym}.updated WHEN ${activePokestop} THEN ${pokestop}.updated ELSE COALESCE(${gym}.updated, ${pokestop}.updated, route_data.updated) END AS ${position}_fort_updated`,
			`CASE WHEN ${activeGym} THEN ${gym}.first_seen_timestamp WHEN ${activePokestop} THEN ${pokestop}.first_seen_timestamp ELSE COALESCE(${gym}.first_seen_timestamp, ${pokestop}.first_seen_timestamp, route_data.updated) END AS ${position}_fort_first_seen`,
			`CASE WHEN ${activeGym} THEN 0 WHEN ${activePokestop} THEN 0 ELSE COALESCE(${gym}.deleted, ${pokestop}.deleted, 0) END AS ${position}_fort_deleted`
		],
		joins:
			`LEFT JOIN pokestop AS ${pokestop} ON ${pokestop}.id = route_data.${position}_fort_id COLLATE utf8mb4_general_ci ` +
			`LEFT JOIN gym AS ${gym} ON ${gym}.id = route_data.${position}_fort_id COLLATE utf8mb4_general_ci`
	};
}

const endpointSql = (["start", "end"] as const).map(getEndpointSql);

function buildRouteCandidateFilter(bounds: Bounds, since?: number) {
	const outerLatPadding = MAX_ROUTE_REACH_METERS / METERS_PER_LATITUDE_DEGREE;
	const maxAbsoluteLatitude = Math.min(
		89,
		Math.max(Math.abs(bounds.minLat), Math.abs(bounds.maxLat)) + outerLatPadding
	);
	const metersPerLongitudeDegree =
		METERS_PER_LONGITUDE_DEGREE * Math.max(Math.cos((maxAbsoluteLatitude * Math.PI) / 180), 0.01);
	const outerLonPadding = MAX_ROUTE_REACH_METERS / metersPerLongitudeDegree;
	const where = [
		"route_data.start_lat BETWEEN ? AND ?",
		"route_data.start_lon BETWEEN ? AND ?",
		"route_data.start_lat BETWEEN ? - ((route_data.distance_meters * ? + ?) / ?) AND ? + ((route_data.distance_meters * ? + ?) / ?)",
		"route_data.start_lon BETWEEN ? - ((route_data.distance_meters * ? + ?) / ?) AND ? + ((route_data.distance_meters * ? + ?) / ?)"
	];
	const values: unknown[] = [
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
		where.push(
			"(route_data.updated > ? OR route_start_pokestop.updated > ? OR route_start_gym.updated > ? OR route_end_pokestop.updated > ? OR route_end_gym.updated > ?)"
		);
		values.push(since, since, since, since, since);
	}

	return { whereSql: ` WHERE ${where.join(" AND ")}`, values };
}

export class RouteQuery extends DbMapObjectQuery<RouteData, FilterRoute> {
	protected readonly type = MapObjectType.ROUTE;
	protected readonly table = "route AS route_data";
	protected readonly fields = [
		"route_data.id",
		"route_data.name",
		"route_data.shortcode",
		"route_data.description",
		"route_data.distance_meters",
		"route_data.duration_seconds",
		...endpointSql.flatMap((endpoint) => endpoint.fields),
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
	// Golbat's newer route table and older fort tables can use different utf8mb4 collations.
	protected readonly joins = endpointSql.map((endpoint) => endpoint.joins).join(" ");

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
		const filter = buildRouteCandidateFilter(bounds, since);
		const query = this.buildLimitedQuery(
			filter.whereSql + " ORDER BY route_data.start_lat, route_data.start_lon, route_data.id",
			filter.values,
			actualLimit
		);
		const candidates = await this.executeQuery<RawRouteData[]>(query.sql, query.values);
		if (candidates.length > actualLimit) {
			return { data: [], examined: actualLimit, limitReached: true };
		}

		const routes = candidates.map(normalizeRouteRow).filter((route) => {
			const coordinates = getRouteCoordinates(route);
			return coordinates.length >= 2 && booleanIntersects(lineString(coordinates), target);
		});
		return {
			examined: routes.length,
			data: routes
		};
	}

	async querySingle(id: string): Promise<MinMapObject<RouteData>[]> {
		const whereClauses = [`${this.idColumn} = ?`, ...this.extraWhere];
		const sql = this.buildSelectFrom() + " WHERE " + whereClauses.join(" AND ");
		const rows = await this.executeQuery<RawRouteData[]>(sql, [id]);
		return rows.map(normalizeRouteRow);
	}
}
