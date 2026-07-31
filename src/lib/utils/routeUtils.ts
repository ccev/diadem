import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import type { Position } from "geojson";

export function routeStartsAt(
	route: Pick<RouteData, "start_fort_id" | "end_fort_id" | "reversible">,
	fortId: string
): boolean {
	return route.start_fort_id === fortId || (route.reversible && route.end_fort_id === fortId);
}

export function getRouteCoordinates(
	route: Pick<RouteData, "start_lon" | "start_lat" | "end_lon" | "end_lat" | "waypoints">
): Position[] {
	const coordinates: Position[] = [
		[route.start_lon, route.start_lat],
		...route.waypoints.map((waypoint) => [waypoint.lng_degrees, waypoint.lat_degrees]),
		[route.end_lon, route.end_lat]
	].filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));

	return coordinates.filter(
		(coordinate, index) =>
			index === 0 ||
			coordinate[0] !== coordinates[index - 1][0] ||
			coordinate[1] !== coordinates[index - 1][1]
	);
}

export function getRouteBounds(
	route: Pick<RouteData, "start_lon" | "start_lat" | "end_lon" | "end_lat" | "waypoints">
): [number, number, number, number] {
	let minLon = Infinity;
	let minLat = Infinity;
	let maxLon = -Infinity;
	let maxLat = -Infinity;
	for (const [lon, lat] of getRouteCoordinates(route)) {
		minLon = Math.min(minLon, lon);
		minLat = Math.min(minLat, lat);
		maxLon = Math.max(maxLon, lon);
		maxLat = Math.max(maxLat, lat);
	}
	return [minLon, minLat, maxLon, maxLat];
}

export function getRouteColor(route: RouteData): string {
	const color = route.image_border_color.trim().replace(/^#/, "");
	return /^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color) ? `#${color}` : "#6366f1";
}

export function getRouteEndpointFort(
	routes: RouteData[],
	fortId: string
): PokestopData | GymData | undefined {
	const route = routes.find((route) => routeStartsAt(route, fortId));
	if (!route) return;

	const isEnd = route.start_fort_id !== fortId && route.end_fort_id === fortId;
	const type =
		(isEnd ? route.end_fort_type : route.start_fort_type) === MapObjectType.GYM
			? MapObjectType.GYM
			: MapObjectType.POKESTOP;
	const updated = isEnd ? route.end_fort_updated : route.start_fort_updated;
	const firstSeen = isEnd ? route.end_fort_first_seen : route.start_fort_first_seen;
	if (isEnd ? route.end_fort_deleted : route.start_fort_deleted) return;
	const base = {
		id: fortId,
		mapId: `${type}-${fortId}`,
		lat: isEnd ? route.end_lat : route.start_lat,
		lon: isEnd ? route.end_lon : route.start_lon,
		name: (isEnd ? route.end_name : route.start_name) ?? undefined,
		url: isEnd ? route.end_image : route.start_image,
		updated: updated ?? route.updated,
		deleted: 0,
		first_seen_timestamp: firstSeen ?? updated ?? route.updated,
		isRouteEndpoint: true
	};

	if (type === MapObjectType.GYM) {
		return {
			...base,
			type,
			team_id: (isEnd ? route.end_team_id : route.start_team_id) ?? undefined,
			availble_slots:
				(isEnd ? route.end_available_slots : route.start_available_slots) ?? undefined,
			in_battle: (isEnd ? route.end_in_battle : route.start_in_battle) ?? undefined,
			ex_raid_eligible:
				(isEnd ? route.end_ex_raid_eligible : route.start_ex_raid_eligible) ?? undefined
		};
	}

	return {
		...base,
		type,
		incident: [],
		quests: []
	};
}
