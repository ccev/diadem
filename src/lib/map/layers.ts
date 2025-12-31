import { getMap } from "@/lib/map/map.svelte";
import type { GeoJSONSource } from "maplibre-gl";
import type { GeoJSON as GeoJsonType } from 'geojson';

export enum MapSourceId {
	MAP_OBJECTS = "mapObjects",
	SELECTED_WEATHER = "selectedWeather",
	SCOUT_BIG_POINTS = "scoutBigPoints",
	SCOUT_SMALL_POINTS = "scoutSmallPoints",
}

export enum MapObjectLayerId {
	ICONS = "mapObjectIcons",
	CIRCLES = "mapObjectCircles",
	POLYGON_FILL = "mapObjectPolygonFill",
	POLYGON_STROKE = "mapObjectPolygonStroke",
}

export function updateMapGeojsonSource(sourceId: MapSourceId, data: GeoJsonType) {
	const map = getMap()
	if (!map) return

	let source: GeoJSONSource | undefined = undefined
	try {
		source = map.getSource<GeoJSONSource>(sourceId)
	} catch (e) {
		// sometimes throws on startup. i think we can ignore this (not 100% sure)
		return
	}

	if (!source) return

	source.setData(data)
}