import type { Feature as GeojsonFeature, MultiPolygon, Point, Polygon } from "geojson";
import {
	getCurrentUiconSetDetailsAllTypes,
	getIconForMap,
	getIconGym,
	getIconInvasion,
	getIconPokemon,
	getIconRaidEgg,
	getIconReward
} from "@/lib/services/uicons.svelte.js";
import { type MapObjectsStateType } from "@/lib/mapObjects/mapObjectsState.svelte.js";
import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
import {
	FORT_OUTDATED_SECONDS,
	SELECTED_MAP_OBJECT_SCALE,
	SPAWNPOINT_OUTDATED_SECONDS
} from "@/lib/constants";
import type { UiconSet, UiconSetModifierType } from "@/lib/services/config/configTypes";
import {
	getCurrentSelectedData,
	isCurrentSelectedOverwrite
} from "@/lib/mapObjects/currentSelectedState.svelte.js";
import { updateMapObjectsGeoJson } from "@/lib/map/featuresManage.svelte";

import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import {
	getActivePokestopFilter,
	hasFortActiveLure,
	isIncidentInvasion,
	parseQuestReward
} from "@/lib/utils/pokestopUtils";
import { getActiveGymFilter } from "@/lib/utils/gymUtils";
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { resize } from "@/lib/services/assets";
import { geojson, s2 } from "s2js";
import { shouldDisplayIncidient, shouldDisplayQuest } from "@/lib/features/filterLogic/pokestop";
import { getRenderer } from "@/lib/map/render/renderMapObjects";

export enum MapObjectFeatureType {
	ICON = 0,
	POLYGON = 1,
	CIRCLE = 2
}

export type MapObjectIconProperties = {
	id: string;
	type: MapObjectFeatureType.ICON;
	imageUrl: string;
	imageSize: number;
	selectedScale: number;
	imageOffset?: number[];
	expires: number | null;
};

export type MapObjectPolygonProperties = {
	id: string;
	type: MapObjectFeatureType.POLYGON;
	fillColor: string;
	strokeColor: string;
	selectedFill: string;
	isSelected: boolean;
};

export type MapObjectCircleProperties = {
	id: string;
	type: MapObjectFeatureType.CIRCLE;
	radius: number;
	selectedScale: number;
	fillColor: string;
	strokeColor: string;
};

export type MapObjectIconFeature = GeojsonFeature<Point, MapObjectIconProperties>;
export type MapObjectPolygonFeature = GeojsonFeature<MultiPolygon, MapObjectPolygonProperties>;
export type MapObjectCircleFeature = GeojsonFeature<Point, MapObjectCircleProperties>;
export type MapObjectFeature =
	| MapObjectPolygonFeature
	| MapObjectIconFeature
	| MapObjectCircleFeature;

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

export function isFeatureIcon(feature: MapObjectFeature): feature is MapObjectIconFeature {
	return feature.properties.type === MapObjectFeatureType.ICON;
}

export function isFeatureCircle(feature: MapObjectFeature): feature is MapObjectCircleFeature {
	return feature.properties.type === MapObjectFeatureType.CIRCLE;
}

export function isFeaturePolygon(feature: MapObjectFeature): feature is MapObjectPolygonFeature {
	return feature.properties.type === MapObjectFeatureType.POLYGON;
}

export function getIconFeature(
	id: string,
	coordinates: Point["coordinates"],
	properties: Omit<MapObjectIconProperties, "type">
): MapObjectIconFeature {
	return {
		type: "Feature",
		geometry: {
			type: "Point",
			coordinates
		},
		properties: {
			...properties,
			imageUrl: resize(properties.imageUrl, { width: 64 }),
			type: MapObjectFeatureType.ICON
		},
		id
	};
}

export function getPolygonFeature(
	id: string,
	coordinates: MultiPolygon["coordinates"],
	properties: Omit<MapObjectPolygonProperties, "type" | "selectedScale">
): MapObjectPolygonFeature {
	return {
		type: "Feature",
		geometry: {
			type: "MultiPolygon",
			coordinates
		},
		properties: {
			...properties,
			type: MapObjectFeatureType.POLYGON
		},
		id
	};
}

export function getCircleFeature(
	id: string,
	coordinates: Point["coordinates"],
	properties: Omit<MapObjectCircleProperties, "type">
): MapObjectCircleFeature {
	return {
		type: "Feature",
		geometry: {
			type: "Point",
			coordinates
		},
		properties: {
			...properties,
			type: MapObjectFeatureType.CIRCLE
		},
		id
	};
}

export function getModifiers(iconSet: UiconSet | undefined, type: UiconSetModifierType) {
	let scale: number = 0.25;
	let offsetY: number = 0;
	let offsetX: number = 0;
	let spacing: number = 0;

	if (iconSet) {
		const modifier = iconSet[type];
		const baseModifier = iconSet.base;
		if (modifier && typeof modifier === "object") {
			scale = modifier?.scale ?? baseModifier?.scale ?? scale;
			offsetY = modifier?.offsetY ?? baseModifier?.offsetY ?? offsetY;
			offsetX = modifier?.offsetX ?? baseModifier?.offsetX ?? offsetX;
			spacing = modifier?.spacing ?? baseModifier?.spacing ?? spacing;
		}
	}

	return { scale, offsetY, offsetX, spacing };
}

export function deleteAllFeaturesOfType(type: MapObjectType) {
	features[type] = {};
}

export function deleteAllFeatures() {
	features = getEmptyFeatures();
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

	const styles = getComputedStyle(document.documentElement);

	const showAllPokestops = getActivePokestopFilter().pokestopPlain.enabled;
	const showLures = getActivePokestopFilter().lure.enabled;
	const showQuests = getActivePokestopFilter().quest.enabled;
	const showInvasions = getActivePokestopFilter().invasion.enabled;
	const showAllGyms = getActiveGymFilter().gymPlain.enabled;

	const iconSets = getCurrentUiconSetDetailsAllTypes();
	const timestamp = currentTimestamp();

	const selectedMapId = getCurrentSelectedData()?.mapId ?? "";
	// const allCurrentMapIds = Object.keys(mapObjects);
	// const allFeatureMapIds = flattenFeatures().map(f => f.properties.id)

	for (const [type, thisFeatures] of Object.entries(features)) {
		for (const [existingId, subFeatures] of Object.entries(thisFeatures)) {
			if (
				subFeatures.find((f) => f.properties?.expires && f.properties.expires < timestamp) ||
				!(existingId in mapObjects)
			) {
				delete features[type][existingId];
			}
		}
	}

	// const loopTime = performance.now();

	for (const obj of Object.values(mapObjects)) {
		if (features[obj.type][obj.mapId]) continue;

		const isSelectedOverwrite = isCurrentSelectedOverwrite(obj.mapId);
		const isSelected = obj.mapId === selectedMapId;

		const renderer = getRenderer(obj.type);
		const subFeatures = renderer.render(obj, isSelected, isSelectedOverwrite);

		features[obj.type][obj.mapId] = subFeatures;
		if (obj.mapId === selectedMapId) selectedFeatures = [...selectedFeatures, ...subFeatures];
	}
	updateMapObjectsGeoJson(getFlattenedFeatures());
}
