import type { GeoJSON as GeoJsonType } from "geojson";
import type maplibregl from "maplibre-gl";

export enum MapSourceId {
	MAP_OBJECTS = "mapObjects",
	SELECTED_WEATHER = "selectedWeather",
	SCOUT_BIG_POINTS = "scoutBigPoints",
	SCOUT_SMALL_POINTS = "scoutSmallPoints",
	COVERAGE_MAP_AREAS = "coverageMapAreas",
	POPUP_ACTION_TIMERS = "popupActionTimers",
	SEARCHED_GEOMETRY = "searchedGeometry",
	WAYFARER_FORTS = "wayfarerForts",
	WAYFARER_CELLS_14 = "wayfarerCells14",
	WAYFARER_CELLS_17 = "wayfarerCells17",
	WAYFARER_CELL_LABELS = "wayfarerCellLabels",
	WAYFARER_CANDIDATES = "wayfarerCandidates"
}

export enum MapObjectLayerId {
	ICONS = "mapObjectIcons",
	CIRCLES = "mapObjectCircles",
	RADIUS_FILL = "mapObjectRadiusFill",
	RADIUS_STROKE = "mapObjectRadiusStroke",
	TIMER_LABELS = "mapObjectTimerLabels",
	POLYGON_FILL = "mapObjectPolygonFill",
	POLYGON_STROKE = "mapObjectPolygonStroke"
}

export enum CoverageMapLayerId {
	POLYGON_FILL = "coverageMapPolygonFill",
	POLYGON_STROKE = "coverageMapPolygonStroke"
}

export enum WayfarerLayerId {
	FORT_CIRCLES = "wayfarerFortCircles",
	FORT_DIAMONDS = "wayfarerFortDiamonds",
	CELLS_14_FILL = "wayfarerCells14Fill",
	CELLS_14_LINE = "wayfarerCells14Line",
	CELLS_14_LINE_RED = "wayfarerCells14LineRed",
	CELLS_14_LINE_AMBER = "wayfarerCells14LineAmber",
	CELLS_14_LINE_GREEN = "wayfarerCells14LineGreen",
	CELLS_17_LINE = "wayfarerCells17Line",
	CELLS_17_FILL = "wayfarerCells17Fill",
	CELL_LABELS = "wayfarerCellLabels",
	CANDIDATE_CIRCLES = "wayfarerCandidateCircles"
}

export const L14_HIGHLIGHT = {
	RED: "red",
	AMBER: "amber",
	GREEN: "green"
} as const;

export function updateMapGeojsonSource(
	map: maplibregl.Map,
	sourceId: MapSourceId,
	data: GeoJsonType
) {
	let source: maplibregl.GeoJSONSource | undefined = undefined;
	try {
		source = map.getSource<maplibregl.GeoJSONSource>(sourceId);
	} catch (e) {
		// sometimes throws on startup. i think we can ignore this (not 100% sure)
		return;
	}

	console.log(source);

	if (!source) return;

	source.setData(data);
}
