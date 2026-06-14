import {
	RANGE_FORTS,
	RANGE_POKEMON,
	RANGE_POKEMON_EXTENDED,
	SELECTED_MAP_OBJECT_SCALE
} from "@/lib/constants";
import { updateMapObjectsGeoJson } from "@/lib/map/render/manageGeojson";
import {
	getCurrentSelectedData,
	isCurrentSelectedOverwrite
} from "@/lib/mapObjects/currentSelectedState.svelte.js";
import { type MapObjectsStateType } from "@/lib/mapObjects/mapObjectsState.svelte.js";

import {
	getPolygonFeature,
	isFeatureCircle,
	isFeatureIcon,
	isFeaturePolygon,
	type MapObjectFeature
} from "@/lib/map/render/featureTypes";
import { getRenderer } from "@/lib/map/render/renderMapObjects";
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { circle } from "@turf/turf";

type FeatureEntry = {
	lat: number;
	lon: number;
	features: MapObjectFeature[];
};

type Features = {
	[key in MapObjectType]: {
		[key: string]: FeatureEntry;
	};
};

const RADIUS_STROKE = "rgba(56, 189, 248, 0.5)";
const RADIUS_FILL = "rgba(56, 189, 248, 0.05)";
const RADIUS_FILL_SELECTED = "rgba(56, 189, 248, 0.2)";

let features: Features = getEmptyFeatures();
let selectedFeatures: MapObjectFeature[] = [];

function getEmptyFeatures(): Features {
	return allMapObjectTypes.reduce((acc, val) => {
		acc[val] = {};
		return acc;
	}, {} as Features);
}

function getFlattenedFeatures() {
	return Object.values(features)
		.map((f) => Object.values(f))
		.map((entries) => entries.map((entry) => entry.features))
		.flat(2);
}

export function deleteAllFeaturesOfType(type: MapObjectType) {
	features[type] = {};
}

export function deleteAllFeatures() {
	features = getEmptyFeatures();
}

export function updateDimmedFeatures() {
	for (const type of allMapObjectTypes) {
		for (const [mapId, entry] of Object.entries(features[type])) {
			for (const feature of entry.features) {
				if (isFeatureIcon(feature)) {
					feature.properties.dimmed =
						getUserSettings().actions[type]?.dimmed.mapIds.includes(mapId) ?? false;
				}
			}
		}
	}
	updateMapObjectsGeoJson(getFlattenedFeatures());
}

function getActionRadiusFeature(type: MapObjectType, mapId: string, center: [number, number]) {
	const action = getUserSettings().actions[type]?.radius;
	if (!action) return;

	const hasMapOverride = action.mapIds.includes(mapId);
	const shouldShow = action.all ? !hasMapOverride : hasMapOverride;
	if (!shouldShow) return;

	let radius: number | undefined = undefined;
	if (type === MapObjectType.POKEMON) {
		radius = action?.extraRadius ? RANGE_POKEMON_EXTENDED : RANGE_POKEMON;
	} else if ([MapObjectType.POKESTOP, MapObjectType.GYM, MapObjectType.STATION].includes(type)) {
		radius = RANGE_FORTS;
	} else {
		return;
	}

	if (!radius) return;

	const feature = circle(center, radius, {
		steps: 96,
		units: "meters"
	});

	return getPolygonFeature(mapId + "-radius", [feature.geometry.coordinates], {
		id: mapId,
		strokeColor: RADIUS_STROKE,
		fillColor: RADIUS_FILL,
		selectedFill: RADIUS_FILL_SELECTED,
		isSelected: false,
		isActionRadius: true
	});
}

export function updateRadiusFeatures() {
	for (const type of allMapObjectTypes) {
		for (const [mapId, entry] of Object.entries(features[type])) {
			entry.features = entry.features.filter(
				(feature) => !(isFeaturePolygon(feature) && feature.properties.isActionRadius)
			);
			const radiusFeature = getActionRadiusFeature(type, mapId, [entry.lon, entry.lat]);
			if (radiusFeature) entry.features.unshift(radiusFeature);
		}
	}
	updateMapObjectsGeoJson(getFlattenedFeatures());
}

export function updateSelected(currentSelected: MapData | null) {
	// TODO base the scale on original modifiers, not the current size
	if (selectedFeatures) {
		for (const feature of selectedFeatures) {
			if (isFeatureIcon(feature) || isFeatureCircle(feature)) {
				feature.properties.selectedScale = 1;
			} else if (isFeaturePolygon(feature)) {
				feature.properties.isSelected = false;
			}
		}
		selectedFeatures = [];
	}

	if (currentSelected) {
		const thisFeatures = features[currentSelected.type][currentSelected.mapId]?.features ?? [];

		for (const feature of thisFeatures) {
			if (isFeatureIcon(feature) || isFeatureCircle(feature)) {
				feature.properties.selectedScale = SELECTED_MAP_OBJECT_SCALE;
			} else if (isFeaturePolygon(feature)) {
				feature.properties.isSelected = true;
			}
		}

		selectedFeatures = thisFeatures;
	}

	updateMapObjectsGeoJson(getFlattenedFeatures());
}

export function updateFeatures(mapObjects: MapObjectsStateType) {
	// TODO perf: only update if needed by storing a id: hash table
	// TODO perf: when currentSelected is updated, only update what's needed and not the whole array
	// TODO: when a gym is updated, it's not being shown on the map

	const selectedMapId = getCurrentSelectedData()?.mapId ?? "";
	// const allCurrentMapIds = Object.keys(mapObjects);
	// const allFeatureMapIds = flattenFeatures().map(f => f.properties.id)

	const actions = getUserSettings().actions;

	for (const type of allMapObjectTypes) {
		const thisFeatures = features[type];
		for (const [existingId, entry] of Object.entries(thisFeatures)) {
			const obj = mapObjects[existingId];
			// invalidate objects that changed positions and have expired
			if (
				entry.features.find(
					(feature) =>
						"expires" in feature.properties &&
						feature.properties.expires &&
						feature.properties.expires < currentTimestamp()
				) ||
				!obj ||
				entry.lon !== obj.lon ||
				entry.lat !== obj.lat
			) {
				selectedFeatures = selectedFeatures.filter((feature) => !entry.features.includes(feature));
				delete features[type][existingId];
			}
		}
	}

	for (const obj of Object.values(mapObjects)) {
		if (features[obj.type][obj.mapId]) continue;

		const isSelectedOverwrite = isCurrentSelectedOverwrite(obj.mapId);
		const isSelected = obj.mapId === selectedMapId;

		const renderer = getRenderer(obj.type);
		const subFeatures = renderer.render(obj, isSelected, isSelectedOverwrite);

		for (const feature of subFeatures) {
			if (isFeatureIcon(feature)) {
				feature.properties.dimmed = actions[obj.type]?.dimmed.mapIds.includes(obj.mapId) ?? false;
			}
		}

		const radiusFeature = getActionRadiusFeature(obj.type, obj.mapId, [obj.lon, obj.lat]);
		if (radiusFeature) subFeatures.unshift(radiusFeature);

		features[obj.type][obj.mapId] = {
			lat: obj.lat,
			lon: obj.lon,
			features: subFeatures
		};
		if (isSelected) selectedFeatures = [...selectedFeatures, ...subFeatures];
	}
	updateMapObjectsGeoJson(getFlattenedFeatures());
}
