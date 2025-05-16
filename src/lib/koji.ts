import type { Feature, Polygon } from 'geojson';

type KojiProperties = {
	name: string
	lucideIcon?: string
	group?: string
}

let geofences: Feature<Polygon, KojiProperties>[] = []

export async function loadKojiGeofences() {
	const result = await fetch("/api/koji")
	const data = await result.json()
	if (data.error) {
		console.error("Error while fetching geofences: " + data.error)
	} else {
		geofences = data.result
	}
}

export function getKojiGeofences() {
	return geofences
}
