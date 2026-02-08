import type { Feature, Polygon } from 'geojson';

export type KojiReference = {
	id: number,
	name: string,
	parent: number | null
}

type KojiProperties = {
	name: string
	lucideIcon?: string
	group?: string
	children: KojiFeature[]
	parentName: string | null
} & KojiReference

export type KojiFeature = Feature<Polygon, KojiProperties>
export type KojiFeatures = KojiFeature[]
let geofences: KojiFeatures = []

export async function loadKojiGeofences() {
	const result = await fetch("/api/koji")

	if (!result.ok) {
		console.error("Error while fetching geofences")
	}

	const data: KojiFeatures = await result.json()

	const areaMap = new Map<number, KojiFeature>();
	data.forEach(a => {
		areaMap.set(a.properties.id, a)
		a.properties.children = []
	});

	data.forEach(area => {
		// @ts-ignore
		const parent = areaMap.get(area.properties.parent);
		if (parent) {
			parent.properties.children.push(area);
			area.properties.parentName = parent.properties.name
		} else {
			area.properties.parentName = null
		}
	});

	geofences = data
}

export function getKojiGeofences() {
	return geofences
}
