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
import type { RouteData, RouteEndpoint, RouteWaypoint } from "@/lib/types/mapObjectData/route";
import { getRouteCoordinates } from "@/lib/utils/routeUtils";
import { bboxPolygon, booleanIntersects, lineString } from "@turf/turf";

const MAX_ROUTE_REACH_METERS = 25_000;
const ROUTE_DISTANCE_FACTOR = 1.1;
const ROUTE_DISTANCE_MARGIN_METERS = 100;
const METERS_PER_LATITUDE_DEGREE = 110_574;
const METERS_PER_LONGITUDE_DEGREE = 111_320;
const CANDIDATE_PAGE_SIZE = 2_000;

type RawRouteWaypoint = RouteWaypoint & {
	elevation_in_meters?: number;
};

type RawRouteData = Omit<
	MinMapObject<RouteData>,
	| "start"
	| "end"
	| "reversible"
	| "tags"
	| "waypoints"
	| "elevation_uphill_meters"
	| "elevation_downhill_meters"
> & {
	elevation_uphill_meters?: number | null;
	elevation_downhill_meters?: number | null;
	start_fort_id: string;
	start_fort_type: string;
	start_name: string | null;
	start_image: string;
	start_lat: number;
	start_lon: number;
	start_team_id: number | null;
	start_available_slots: number | null;
	start_in_battle: number | null;
	start_ex_raid_eligible: number | null;
	start_fort_updated: number;
	start_fort_first_seen: number;
	start_fort_deleted: number | string;
	end_fort_id: string;
	end_fort_type: string;
	end_name: string | null;
	end_image: string;
	end_lat: number;
	end_lon: number;
	end_team_id: number | null;
	end_available_slots: number | null;
	end_in_battle: number | null;
	end_ex_raid_eligible: number | null;
	end_fort_updated: number;
	end_fort_first_seen: number;
	end_fort_deleted: number | string;
	reversible: boolean | number;
	tags: unknown;
	waypoints: unknown;
};

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
		"CASE WHEN route_start_gym.id IS NOT NULL AND route_start_gym.deleted = 0 THEN 'gym' WHEN route_start_pokestop.id IS NOT NULL AND route_start_pokestop.deleted = 0 THEN 'pokestop' WHEN route_start_gym.id IS NOT NULL THEN 'gym' ELSE 'pokestop' END AS start_fort_type",
		"COALESCE(IF(route_start_gym.deleted = 0, route_start_gym.name, NULL), IF(route_start_pokestop.deleted = 0, route_start_pokestop.name, NULL), route_start_gym.name, route_start_pokestop.name) AS start_name",
		"route_data.start_image",
		"route_data.start_lat",
		"route_data.start_lon",
		"route_start_gym.team_id AS start_team_id",
		"route_start_gym.availble_slots AS start_available_slots",
		"route_start_gym.in_battle AS start_in_battle",
		"route_start_gym.ex_raid_eligible AS start_ex_raid_eligible",
		"CASE WHEN route_start_gym.id IS NOT NULL AND route_start_gym.deleted = 0 THEN route_start_gym.updated WHEN route_start_pokestop.id IS NOT NULL AND route_start_pokestop.deleted = 0 THEN route_start_pokestop.updated ELSE COALESCE(route_start_gym.updated, route_start_pokestop.updated, route_data.updated) END AS start_fort_updated",
		"CASE WHEN route_start_gym.id IS NOT NULL AND route_start_gym.deleted = 0 THEN route_start_gym.first_seen_timestamp WHEN route_start_pokestop.id IS NOT NULL AND route_start_pokestop.deleted = 0 THEN route_start_pokestop.first_seen_timestamp ELSE COALESCE(route_start_gym.first_seen_timestamp, route_start_pokestop.first_seen_timestamp, route_data.updated) END AS start_fort_first_seen",
		"CASE WHEN route_start_gym.id IS NOT NULL AND route_start_gym.deleted = 0 THEN 0 WHEN route_start_pokestop.id IS NOT NULL AND route_start_pokestop.deleted = 0 THEN 0 ELSE COALESCE(route_start_gym.deleted, route_start_pokestop.deleted, 0) END AS start_fort_deleted",
		"route_data.end_fort_id",
		"CASE WHEN route_end_gym.id IS NOT NULL AND route_end_gym.deleted = 0 THEN 'gym' WHEN route_end_pokestop.id IS NOT NULL AND route_end_pokestop.deleted = 0 THEN 'pokestop' WHEN route_end_gym.id IS NOT NULL THEN 'gym' ELSE 'pokestop' END AS end_fort_type",
		"COALESCE(IF(route_end_gym.deleted = 0, route_end_gym.name, NULL), IF(route_end_pokestop.deleted = 0, route_end_pokestop.name, NULL), route_end_gym.name, route_end_pokestop.name) AS end_name",
		"route_data.end_image",
		"route_data.end_lat",
		"route_data.end_lon",
		"route_end_gym.team_id AS end_team_id",
		"route_end_gym.availble_slots AS end_available_slots",
		"route_end_gym.in_battle AS end_in_battle",
		"route_end_gym.ex_raid_eligible AS end_ex_raid_eligible",
		"CASE WHEN route_end_gym.id IS NOT NULL AND route_end_gym.deleted = 0 THEN route_end_gym.updated WHEN route_end_pokestop.id IS NOT NULL AND route_end_pokestop.deleted = 0 THEN route_end_pokestop.updated ELSE COALESCE(route_end_gym.updated, route_end_pokestop.updated, route_data.updated) END AS end_fort_updated",
		"CASE WHEN route_end_gym.id IS NOT NULL AND route_end_gym.deleted = 0 THEN route_end_gym.first_seen_timestamp WHEN route_end_pokestop.id IS NOT NULL AND route_end_pokestop.deleted = 0 THEN route_end_pokestop.first_seen_timestamp ELSE COALESCE(route_end_gym.first_seen_timestamp, route_end_pokestop.first_seen_timestamp, route_data.updated) END AS end_fort_first_seen",
		"CASE WHEN route_end_gym.id IS NOT NULL AND route_end_gym.deleted = 0 THEN 0 WHEN route_end_pokestop.id IS NOT NULL AND route_end_pokestop.deleted = 0 THEN 0 ELSE COALESCE(route_end_gym.deleted, route_end_pokestop.deleted, 0) END AS end_fort_deleted",
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
		"LEFT JOIN pokestop AS route_start_pokestop ON route_start_pokestop.id = route_data.start_fort_id COLLATE utf8mb4_general_ci " +
		"LEFT JOIN gym AS route_start_gym ON route_start_gym.id = route_data.start_fort_id COLLATE utf8mb4_general_ci " +
		"LEFT JOIN pokestop AS route_end_pokestop ON route_end_pokestop.id = route_data.end_fort_id COLLATE utf8mb4_general_ci " +
		"LEFT JOIN gym AS route_end_gym ON route_end_gym.id = route_data.end_fort_id COLLATE utf8mb4_general_ci";

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
			baseWhere.push(
				`(${this.updatedColumn} > ? OR route_start_pokestop.updated > ? OR route_start_gym.updated > ? OR route_end_pokestop.updated > ? OR route_end_gym.updated > ?)`
			);
			baseValues.push(since, since, since, since, since);
		}

		let cursor: Pick<RawRouteData, "start_lat" | "start_lon" | "id"> | undefined;
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
			const candidates = await this.executeQuery<RawRouteData[]>(sql, values);
			examined += candidates.length;
			const lastCandidate = candidates.at(-1);
			const nextCursor = lastCandidate
				? {
						start_lat: lastCandidate.start_lat,
						start_lon: lastCandidate.start_lon,
						id: lastCandidate.id
					}
				: undefined;

			for (const candidate of candidates) {
				this.prepare(candidate as unknown as MinMapObject<RouteData>);
				const route = candidate as unknown as MinMapObject<RouteData>;
				const coordinates = getRouteCoordinates(route);
				if (coordinates.length >= 2 && booleanIntersects(lineString(coordinates), target)) {
					matches.push(route);
					if (matches.length > actualLimit) {
						return { data: [], examined: actualLimit, limitReached: true };
					}
				}
			}
			if (examined > actualLimit) {
				return { data: [], examined: actualLimit, limitReached: true };
			}

			if (candidates.length < pageSize) break;
			if (!nextCursor) break;
			cursor = nextCursor;
		}

		return { data: matches, examined };
	}

	prepare(data: MinMapObject<RouteData>): void {
		if (data.start && data.end) return;

		const raw = data as unknown as RawRouteData;
		const waypoints = this.parseJsonArray<RawRouteWaypoint>(raw.waypoints).filter(
			(waypoint) => Number.isFinite(waypoint.lat_degrees) && Number.isFinite(waypoint.lng_degrees)
		);
		const hasElevation =
			Number.isFinite(raw.elevation_uphill_meters) &&
			Number.isFinite(raw.elevation_downhill_meters);
		let elevationUphill = hasElevation ? Number(raw.elevation_uphill_meters) : 0;
		let elevationDownhill = hasElevation ? Number(raw.elevation_downhill_meters) : 0;
		if (!hasElevation) {
			let previousElevation: number | undefined;
			for (const waypoint of waypoints) {
				const elevation = waypoint.elevation_in_meters;
				if (elevation === undefined || !Number.isFinite(elevation)) continue;

				if (previousElevation !== undefined) {
					const difference = elevation - previousElevation;
					if (difference > 0) elevationUphill += difference;
					else elevationDownhill -= difference;
				}
				previousElevation = elevation;
			}
		}

		const normalized: MinMapObject<RouteData> = {
			id: raw.id,
			lat: raw.lat,
			lon: raw.lon,
			name: raw.name,
			shortcode: raw.shortcode,
			description: raw.description,
			distance_meters: raw.distance_meters,
			duration_seconds: raw.duration_seconds,
			elevation_uphill_meters: elevationUphill,
			elevation_downhill_meters: elevationDownhill,
			start: this.normalizeEndpoint(raw, "start"),
			end: this.normalizeEndpoint(raw, "end"),
			image: raw.image,
			image_border_color: raw.image_border_color,
			reversible: Boolean(Number(raw.reversible)),
			tags: this.parseJsonArray<string>(raw.tags),
			route_type: raw.route_type,
			updated: raw.updated,
			version: raw.version,
			waypoints: waypoints.map(({ lat_degrees, lng_degrees }) => ({
				lat_degrees,
				lng_degrees
			}))
		};

		const target = data as unknown as Record<string, unknown>;
		for (const key of Object.keys(target)) delete target[key];
		Object.assign(target, normalized);
	}

	private normalizeEndpoint(data: RawRouteData, position: "start" | "end"): RouteEndpoint {
		const isEnd = position === "end";
		const type = (isEnd ? data.end_fort_type : data.start_fort_type) as MapObjectType;
		const base = {
			id: isEnd ? data.end_fort_id : data.start_fort_id,
			name: isEnd ? data.end_name : data.start_name,
			image: isEnd ? data.end_image : data.start_image,
			lat: isEnd ? data.end_lat : data.start_lat,
			lon: isEnd ? data.end_lon : data.start_lon,
			updated: isEnd ? data.end_fort_updated : data.start_fort_updated,
			firstSeen: isEnd ? data.end_fort_first_seen : data.start_fort_first_seen,
			deleted: Boolean(Number(isEnd ? data.end_fort_deleted : data.start_fort_deleted))
		};
		if (type === MapObjectType.GYM) {
			const inBattle = isEnd ? data.end_in_battle : data.start_in_battle;
			const exRaidEligible = isEnd ? data.end_ex_raid_eligible : data.start_ex_raid_eligible;
			return {
				...base,
				type,
				teamId: isEnd ? data.end_team_id : data.start_team_id,
				availableSlots: isEnd ? data.end_available_slots : data.start_available_slots,
				inBattle: inBattle === null ? null : Boolean(Number(inBattle)),
				exRaidEligible: exRaidEligible === null ? null : Boolean(Number(exRaidEligible))
			};
		}

		return { ...base, type: MapObjectType.POKESTOP };
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
