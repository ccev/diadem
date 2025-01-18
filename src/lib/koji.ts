import type { Feature } from 'geojson';

let geofences: Feature[] = []

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
