import type { FeatureCollection, LineString } from "geojson";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { MapSourceId, updateMapGeojsonSource } from "@/lib/map/layers";

type Waypoint = {
	lat_degrees: number;
	lng_degrees: number;
	elevation_in_meters: number;
};

const emptyCollection: FeatureCollection<LineString> = {
	type: "FeatureCollection",
	features: []
};

// Anchor fort: tracks which fort location was originally clicked
let anchorFortId: string | null = null;

export function setRouteAnchorFortId(fortId: string | null) {
	anchorFortId = fortId;
}

export function getRouteAnchorFortId(): string | null {
	return anchorFortId;
}

function routeToLineFeature(route: RouteData, isSelected: boolean) {
	const waypoints: Waypoint[] =
		typeof route.waypoints === "string"
			? JSON.parse(route.waypoints)
			: route.waypoints;

	const coordinates = waypoints.map((wp) => [wp.lng_degrees, wp.lat_degrees]);

	return {
		type: "Feature" as const,
		geometry: {
			type: "LineString" as const,
			coordinates
		},
		properties: {
			mapId: route.mapId,
			isSelected
		}
	};
}

export function showRoutePaths(routes: RouteData[], selectedMapId: string) {
	// Selected route first so it renders on top
	const selected = routes.filter((r) => r.mapId === selectedMapId);
	const others = routes.filter((r) => r.mapId !== selectedMapId);

	const features = [
		...others.map((r) => routeToLineFeature(r, false)),
		...selected.map((r) => routeToLineFeature(r, true))
	];

	updateMapGeojsonSource(MapSourceId.ROUTE_PATHS, {
		type: "FeatureCollection",
		features
	});
}

export function clearRoutePaths() {
	anchorFortId = null;
	updateMapGeojsonSource(MapSourceId.ROUTE_PATHS, emptyCollection);
}
