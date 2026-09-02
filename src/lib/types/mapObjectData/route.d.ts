import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export type RouteWaypoint = {
	lat_degrees: number;
	lng_degrees: number;
};

export type RouteFortType = MapObjectType.POKESTOP | MapObjectType.GYM;

export type RouteData = {
	id: string;
	mapId: string;
	type: MapObjectType.ROUTE;
	lat: number; // start lat, to have a reference point
	lon: number;
	name: string;
	shortcode: string;
	description: string;
	distance_meters: number;
	duration_seconds: number;
	elevation_uphill_meters: number;
	elevation_downhill_meters: number;
	start_fort_id: string;
	start_fort_type: RouteFortType;
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
	start_fort_deleted: number;
	end_fort_id: string;
	end_fort_type: RouteFortType;
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
	end_fort_deleted: number;
	image: string;
	image_border_color: string;
	reversible: boolean;
	tags: string[];
	route_type: number; // Renamed from 'type' in SQL to avoid conflict with discriminant
	updated: number;
	version: number;
	waypoints: RouteWaypoint[];
};
