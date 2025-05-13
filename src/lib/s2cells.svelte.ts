import { s2, s1, r1, geojson } from 's2js';
import type { FilterS2Cell } from '@/lib/filters/filters';
import type { Bounds } from '@/lib/mapObjects/normalizedBounds';
import { getMap } from '@/lib/map/map.svelte';
import type { Polygon, Feature, FeatureCollection } from 'geojson';
import { files } from '$service-worker';

export type S2CellProperties = {
	id: string
	fillColor: string
	strokeColor: string
	level: number
}

export type S2CellFeature = Feature<Polygon, S2CellProperties>

let s2CellGeojson: FeatureCollection<Polygon, S2CellProperties> = $state({
	type: 'FeatureCollection',
	features: []
})

const DEGREE = Math.PI / 180;

export function getS2CellGeojson() {
	return s2CellGeojson
}

export function updateCoveringS2Cells(data: { filter: FilterS2Cell } & Bounds) {
	let levels: number[] = []
	if (data.filter.type === "all") {
		levels = data.filter.filters?.levels ?? []
	}

	const zoom = getMap()?.getZoom() ?? 0;
	console.debug("updating s2cells")

	s2CellGeojson.features = (
		levels.flatMap((level) => {
			if (zoom + 2.5 < level) return []

			const regionCoverer = new s2.RegionCoverer({ minLevel: level, maxLevel: level });

			const region = new s2.Rect(
				new r1.Interval(data.minLat * DEGREE, data.maxLat * DEGREE),
				s1.Interval.fromEndpoints(data.minLon * DEGREE, data.maxLon * DEGREE)
			);

			return regionCoverer.covering(region).map((cell) => {
				const s2cell = s2.Cell.fromCellID(cell);
				const polygon = geojson.toGeoJSON(s2cell) as Polygon
				const mapId = "s2cell-" + s2cell.id

				return {
					geometry: polygon,
					id: mapId,
					type: 'Feature',
					properties: {
						id: mapId,
						strokeColor: "#000000",
						fillColor: "#f0f0f0",
						level
					}
				} as S2CellFeature;
			});
		}) ?? []
	);
}
