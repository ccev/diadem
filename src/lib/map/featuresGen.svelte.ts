import { type MapObjectsStateType } from "@/lib/mapObjects/mapObjectsState.svelte.js";
import { SELECTED_MAP_OBJECT_SCALE } from "@/lib/constants";
import {
	getCurrentSelectedData,
	isCurrentSelectedOverwrite
} from "@/lib/mapObjects/currentSelectedState.svelte.js";
import { updateMapObjectsGeoJson } from "@/lib/map/render/manageGeojson";

import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getRenderer } from "@/lib/map/render/renderMapObjects";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import {
	isFeatureCircle,
	isFeatureIcon,
	isFeaturePolygon,
	type MapObjectFeature
} from "@/lib/map/render/featureTypes";

type Features = {
	[key in MapObjectType]: {
		[key: string]: MapObjectFeature[];
	};
};

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
		.flat(2);
}

export function deleteAllFeaturesOfType(type: MapObjectType) {
	features[type] = {};
}

export function deleteAllFeatures() {
	features = getEmptyFeatures();
}

export function updateDimmed() {
	for (const type of allMapObjectTypes) {
		for (const [mapId, subFeatures] of Object.entries(features[type])) {
			for (const feature of subFeatures) {
				if (isFeatureIcon(feature)) feature.properties.dimmed = getUserSettings().actions[type]?.dimmed.mapIds.includes(mapId) ?? false;
			}
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
		const thisFeatures = features[currentSelected.type][currentSelected.mapId] ?? [];

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

	const actions = getUserSettings().actions

	for (const [type, thisFeatures] of Object.entries(features)) {
		for (const [existingId, subFeatures] of Object.entries(thisFeatures)) {
			if (
				subFeatures.find(
					(f) => f.properties?.expires && f.properties.expires < currentTimestamp()
				) ||
				!(existingId in mapObjects)
			) {
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

		features[obj.type][obj.mapId] = subFeatures;
		if (isSelected) selectedFeatures = [...selectedFeatures, ...subFeatures];
	}
	updateMapObjectsGeoJson(getFlattenedFeatures());
}
