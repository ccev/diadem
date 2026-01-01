import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { getKojiGeofences } from './koji';

type MapFenceProperties = {
	id: string
	name: string
	strokeColor: string
	fillColor: string
}

type MapFenceFeature = Feature<Polygon, MapFenceProperties>

function buildMapFencesGeojson(): FeatureCollection<Polygon, MapFenceProperties> {
	const geofences = getKojiGeofences()
	const styles = typeof document !== 'undefined'
		? getComputedStyle(document.documentElement)
		: null
	const strokeColor = styles?.getPropertyValue('--fence-stroke') || 'rgba(100, 149, 237, 0.7)'
	const fillColor = styles?.getPropertyValue('--fence-fill') || 'rgba(100, 149, 237, 0.15)'

	return {
		type: 'FeatureCollection',
		features: geofences.map((fence, index): MapFenceFeature => ({
			type: 'Feature',
			geometry: fence.geometry,
			id: `fence-${index}`,
			properties: {
				id: `fence-${index}`,
				name: fence.properties.name,
				strokeColor,
				fillColor
			}
		}))
	}
}

export function getMapFencesGeojson(): FeatureCollection<Polygon, MapFenceProperties> {
	return buildMapFencesGeojson()
}
