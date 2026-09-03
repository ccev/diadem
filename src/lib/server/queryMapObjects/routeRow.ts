import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { RouteData, RouteEndpoint, RouteWaypoint } from "@/lib/types/mapObjectData/route";

type RawRouteWaypoint = RouteWaypoint & {
	elevation_in_meters?: number;
};

export type RawRouteData = Omit<
	MinMapObject<RouteData>,
	| "lat"
	| "lon"
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

export function normalizeRouteRow(row: RawRouteData): MinMapObject<RouteData> {
	const waypoints = parseJsonArray<RawRouteWaypoint>(row.waypoints).filter(
		(waypoint) => Number.isFinite(waypoint.lat_degrees) && Number.isFinite(waypoint.lng_degrees)
	);
	const hasElevation =
		Number.isFinite(row.elevation_uphill_meters) && Number.isFinite(row.elevation_downhill_meters);
	let elevationUphill = hasElevation ? Number(row.elevation_uphill_meters) : 0;
	let elevationDownhill = hasElevation ? Number(row.elevation_downhill_meters) : 0;
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

	return {
		id: row.id,
		lat: row.start_lat,
		lon: row.start_lon,
		name: row.name,
		shortcode: row.shortcode,
		description: row.description,
		distance_meters: row.distance_meters,
		duration_seconds: row.duration_seconds,
		elevation_uphill_meters: elevationUphill,
		elevation_downhill_meters: elevationDownhill,
		start: normalizeEndpoint(row, "start"),
		end: normalizeEndpoint(row, "end"),
		image: row.image,
		image_border_color: row.image_border_color,
		reversible: Boolean(Number(row.reversible)),
		tags: parseJsonArray<string>(row.tags),
		route_type: row.route_type,
		updated: row.updated,
		version: row.version,
		waypoints: waypoints.map(({ lat_degrees, lng_degrees }) => ({
			lat_degrees,
			lng_degrees
		}))
	};
}

function normalizeEndpoint(row: RawRouteData, position: "start" | "end"): RouteEndpoint {
	const isEnd = position === "end";
	const type = (isEnd ? row.end_fort_type : row.start_fort_type) as MapObjectType;
	const base = {
		id: isEnd ? row.end_fort_id : row.start_fort_id,
		name: isEnd ? row.end_name : row.start_name,
		image: isEnd ? row.end_image : row.start_image,
		lat: isEnd ? row.end_lat : row.start_lat,
		lon: isEnd ? row.end_lon : row.start_lon,
		updated: isEnd ? row.end_fort_updated : row.start_fort_updated,
		firstSeen: isEnd ? row.end_fort_first_seen : row.start_fort_first_seen,
		deleted: Boolean(Number(isEnd ? row.end_fort_deleted : row.start_fort_deleted))
	};
	if (type === MapObjectType.GYM) {
		const inBattle = isEnd ? row.end_in_battle : row.start_in_battle;
		const exRaidEligible = isEnd ? row.end_ex_raid_eligible : row.start_ex_raid_eligible;
		return {
			...base,
			type,
			teamId: isEnd ? row.end_team_id : row.start_team_id,
			availableSlots: isEnd ? row.end_available_slots : row.start_available_slots,
			inBattle: inBattle === null ? null : Boolean(Number(inBattle)),
			exRaidEligible: exRaidEligible === null ? null : Boolean(Number(exRaidEligible))
		};
	}

	return { ...base, type: MapObjectType.POKESTOP };
}

function parseJsonArray<T>(value: unknown): T[] {
	if (Array.isArray(value)) return value as T[];
	if (typeof value !== "string" || !value) return [];

	try {
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) ? (parsed as T[]) : [];
	} catch {
		return [];
	}
}
