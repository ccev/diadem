import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export type RouteWaypoint = {
	lat_degrees: number;
	lng_degrees: number;
	elevation_in_meters?: number;
};

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
	start_fort_id: string;
	start_name: string | null;
	start_image: string;
	start_lat: number;
	start_lon: number;
	end_fort_id: string;
	end_name: string | null;
	end_image: string;
	end_lat: number;
	end_lon: number;
	image: string;
	image_border_color: string;
	reversible: boolean;
	tags: string[];
	route_type: number; // Renamed from 'type' in SQL to avoid conflict with discriminant
	updated: number;
	version: number;
	waypoints: RouteWaypoint[];
};
