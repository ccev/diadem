import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export type RouteWaypoint = {
	lat_degrees: number;
	lng_degrees: number;
};

type RouteEndpointBase = {
	id: string;
	name: string | null;
	image: string;
	lat: number;
	lon: number;
	updated: number;
	firstSeen: number;
	deleted: boolean;
};

export type RoutePokestopEndpoint = RouteEndpointBase & {
	type: MapObjectType.POKESTOP;
};

export type RouteGymEndpoint = RouteEndpointBase & {
	type: MapObjectType.GYM;
	teamId: number | null;
	availableSlots: number | null;
	inBattle: boolean | null;
	exRaidEligible: boolean | null;
};

export type RouteEndpoint = RoutePokestopEndpoint | RouteGymEndpoint;

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
	start: RouteEndpoint;
	end: RouteEndpoint;
	image: string;
	image_border_color: string;
	reversible: boolean;
	tags: string[];
	route_type: number; // Renamed from 'type' in SQL to avoid conflict with discriminant
	updated: number;
	version: number;
	waypoints: RouteWaypoint[];
};
