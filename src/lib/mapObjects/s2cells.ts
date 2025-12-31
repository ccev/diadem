import { geojson, r1, s1, s2 } from "s2js";
import type { FilterS2Cell } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { getMap } from "@/lib/map/map.svelte.js";
import type { Feature, Polygon } from "geojson";
import type { CellID } from "s2js/dist/s2/cellid";
import type { MapObjectPolygonProperties } from "@/lib/map/featuresGen.svelte";
import type { S2CellData } from "@/lib/types/mapObjectData/s2cell";

export type S2CellProperties = {
	level: number;
} & MapObjectPolygonProperties;

export type S2CellFeature = Feature<Polygon, S2CellProperties>;

const DEGREE = Math.PI / 180;

export function getCoveringS2Cells(bounds: Bounds, level: number): s2.CellUnion {
	const regionCoverer = new s2.RegionCoverer({ minLevel: level, maxLevel: level });

	const region = new s2.Rect(
		new r1.Interval(bounds.minLat * DEGREE, bounds.maxLat * DEGREE),
		s1.Interval.fromEndpoints(bounds.minLon * DEGREE, bounds.maxLon * DEGREE)
	);

	return regionCoverer.covering(region);
}

export function cellToFeature(
	cellId: CellID,
	strokeColor: string,
	fillColor: string,
	idPrefix: string
): S2CellFeature {
	const cell = s2.Cell.fromCellID(cellId);
	const polygon = geojson.toGeoJSON(cell) as Polygon;
	const mapId = idPrefix + "-s2cell-" + cell.id;

	return {
		geometry: polygon,
		id: mapId,
		type: "Feature",
		properties: {
			id: mapId,
			strokeColor,
			fillColor,
			level: cell.level
		}
	} as S2CellFeature;
}

export function getS2CellMapObjects(bounds: Bounds, filter: FilterS2Cell) {
	let levels = filter.filters.flatMap((f) => f.level ?? []);

	const zoom = getMap()?.getZoom() ?? 0;

	return levels.flatMap((level) => {
		if (zoom + 2.5 < level) return [];
		const cells = getCoveringS2Cells(bounds, level);

		return cells.map((cellId) => {
			return {
				id: cellId.toString(),
				lat: 0,
				lon: 0,
				cellId: cellId
			} as Partial<S2CellData>;
		});
	});
}