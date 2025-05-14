import { geojson, r1, s1, s2 } from 's2js';
import type { FilterS2Cell } from '@/lib/filters/filters';
import type { Bounds } from '@/lib/mapObjects/mapBounds';
import { getMap } from '@/lib/map/map.svelte.js';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { CellID } from 's2js/dist/s2/cellid';

export type S2CellProperties = {
	id: string;
	fillColor: string;
	strokeColor: string;
	level: number;
};

export type S2CellFeature = Feature<Polygon, S2CellProperties>;

let s2CellGeojson: FeatureCollection<Polygon, S2CellProperties> = $state({
	type: 'FeatureCollection',
	features: []
});

const DEGREE = Math.PI / 180;

export function getS2CellGeojson() {
	return s2CellGeojson;
}

export function getCoveringS2Cells(bounds: Bounds, level: number): s2.CellUnion {
	const regionCoverer = new s2.RegionCoverer({ minLevel: level, maxLevel: level });

	const region = new s2.Rect(
		new r1.Interval(bounds.minLat * DEGREE, bounds.maxLat * DEGREE),
		s1.Interval.fromEndpoints(bounds.minLon * DEGREE, bounds.maxLon * DEGREE)
	);

	return regionCoverer.covering(region)
}

export function cellToFeature(cellId: CellID, strokeColor: string, fillColor: string, idPrefix: string): S2CellFeature {
	const cell = s2.Cell.fromCellID(cellId);
	const polygon = geojson.toGeoJSON(cell) as Polygon;
	const mapId = idPrefix + '-s2cell-' + cell.id;

	return {
		geometry: polygon,
		id: mapId,
		type: 'Feature',
		properties: {
			id: mapId,
			strokeColor,
			fillColor,
			level: cell.level
		}
	} as S2CellFeature;
}

export function updateS2CellGeojson(data: { filter: FilterS2Cell } & Bounds) {
	let levels: number[] = [];
	if (data.filter.type === 'all') {
		levels = data.filter.filters?.levels ?? [];
	}

	const zoom = getMap()?.getZoom() ?? 0;

	s2CellGeojson.features =
		levels.flatMap((level) => {
			if (zoom + 2.5 < level) return [];
			const cells = getCoveringS2Cells(data, level)

			return cells.map((cellId) => {
				return cellToFeature(cellId, '#000000', '#f0f0f0', 'custom')
			});
		}) ?? [];
}
