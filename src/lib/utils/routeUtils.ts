import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
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

export function getRouteColor(route: RouteData): string {
	const color = route.image_border_color.trim().replace(/^#/, "");
	return /^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color) ? `#${color}` : "#6366f1";
}

export function getRouteEndpointPokestop(
	routes: RouteData[],
	fortId: string
): PokestopData | undefined {
	const route = routes.find((route) => routeStartsAt(route, fortId));
	if (!route) return;

	const isReversed = route.end_fort_id === fortId;
	return {
		id: fortId,
		mapId: `${MapObjectType.POKESTOP}-${fortId}`,
		type: MapObjectType.POKESTOP,
		lat: isReversed ? route.end_lat : route.start_lat,
		lon: isReversed ? route.end_lon : route.start_lon,
		name: (isReversed ? route.end_name : route.start_name) ?? undefined,
		url: isReversed ? route.end_image : route.start_image,
		incident: [],
		quests: [],
		updated: route.updated,
		deleted: 0,
		first_seen_timestamp: route.updated,
		isRouteEndpoint: true
	};
}
