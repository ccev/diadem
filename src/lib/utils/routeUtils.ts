import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { RouteData, RouteEndpoint } from "@/lib/types/mapObjectData/route";
import type { Position } from "geojson";

export function routeStartsAt(
	route: Pick<RouteData, "reversible"> & {
		start: Pick<RouteEndpoint, "id">;
		end: Pick<RouteEndpoint, "id">;
	},
	fortId: string
): boolean {
	return route.start.id === fortId || (route.reversible && route.end.id === fortId);
}

export function getRouteCoordinates(
	route: Pick<RouteData, "start" | "end" | "waypoints">
): Position[] {
	const coordinates: Position[] = [
		[route.start.lon, route.start.lat],
		...route.waypoints.map((waypoint) => [waypoint.lng_degrees, waypoint.lat_degrees]),
		[route.end.lon, route.end.lat]
	].filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));

	return coordinates.filter(
		(coordinate, index) =>
			index === 0 ||
			coordinate[0] !== coordinates[index - 1][0] ||
			coordinate[1] !== coordinates[index - 1][1]
	);
}

export function getRouteBounds(
	route: Pick<RouteData, "start" | "end" | "waypoints">
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
	const route = routes.find((route) => route.start.id === fortId || route.end.id === fortId);
	if (!route) return;

	const endpoint = route.start.id === fortId ? route.start : route.end;
	if (endpoint.deleted) return;
	const base = {
		id: fortId,
		mapId: `${endpoint.type}-${fortId}`,
		lat: endpoint.lat,
		lon: endpoint.lon,
		name: endpoint.name ?? undefined,
		url: endpoint.image,
		updated: endpoint.updated ?? route.updated,
		deleted: 0,
		first_seen_timestamp: endpoint.firstSeen ?? endpoint.updated ?? route.updated,
		isRouteEndpoint: true
	} as const;

	if (endpoint.type === MapObjectType.GYM) {
		return {
			...base,
			type: endpoint.type,
			team_id: endpoint.teamId ?? undefined,
			availble_slots: endpoint.availableSlots ?? undefined,
			in_battle: endpoint.inBattle === null ? undefined : Number(endpoint.inBattle),
			ex_raid_eligible:
				endpoint.exRaidEligible === null ? undefined : Number(endpoint.exRaidEligible)
		};
	}

	return {
		...base,
		type: endpoint.type,
		incident: [],
		quests: []
	};
}
