import type { Feature, Polygon } from "geojson";
import { getHeaders, parseResponse } from "@/lib/utils/requests";

export type KojiReference = {
	id: number;
	name: string;
	parent: string | null;
};

type KojiProperties = {
	name: string;
	lucideIcon?: string;
	group?: string;
	children: KojiFeature[];
	parentName: string | null;
} & KojiReference;

export type KojiFeature = Feature<Polygon, KojiProperties>;
export type KojiFeatures = KojiFeature[];
export type KojiSidebarEntry =
	KojiFeature | { properties: Pick<KojiProperties, "name" | "lucideIcon" | "children"> };
let geofences: KojiFeatures = [];

export async function loadKojiGeofences() {
	const result = await fetch("/api/koji", { headers: getHeaders() });

	if (!result.ok) {
		// this also errors when koji is disabled by admin, but checking isSupportedFeature would race on initial loading
		console.error("Error while fetching geofences");
		return;
	}

	const data = await parseResponse<KojiFeatures>(result);

	const areaMap = new Map<string, KojiFeature>();
	data.forEach((a) => {
		areaMap.set(a.properties.name, a);
		a.properties.children = [];
	});

	data.forEach((area) => {
		if (!area.properties.parent) return;

		const parent = areaMap.get(area.properties.parent);
		if (parent) {
			parent.properties.children.push(area);
			area.properties.parentName = parent.properties.name;
		} else {
			area.properties.parentName = null;
		}
	});

	geofences = data;
}

export function getKojiGeofences() {
	return geofences;
}

// Virtual parents belong only to the sidebar, never to the geospatial data.
export function getKojiSidebarEntries(): KojiSidebarEntry[] {
	const names = new Set(geofences.map((area) => area.properties.name));
	const groups = new Map<string, KojiSidebarEntry>();
	const entries: KojiSidebarEntry[] = [];

	for (const area of geofences) {
		const parent = area.properties.parent;
		if (!parent) {
			entries.push(area);
		} else if (!names.has(parent)) {
			let group = groups.get(parent);
			if (!group) {
				group = { properties: { name: parent, children: [] } };
				groups.set(parent, group);
				entries.push(group);
			}
			group.properties.children.push(area);
		}
	}

	return entries;
}
