import type { Feature, Polygon } from 'geojson';

type KojiProperties = {
	name: string
	lucideIcon?: string
	group?: string
}
export type KojiFeature = Feature<Polygon, KojiProperties>
export type KojiFeatures = KojiFeature[]
let geofences: KojiFeatures = []

export async function loadKojiGeofences() {
	const result = await fetch("/api/koji")

	if (!result.ok) {
		console.error("Error while fetching geofences")
	}
	
	geofences = await result.json()
}

export function getKojiGeofences() {
	return geofences
}
