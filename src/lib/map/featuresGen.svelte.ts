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
import {
	getMapObjectsRevision,
	type MapObjectsStateType
} from "@/lib/mapObjects/mapObjectsState.svelte.js";

import {
	getPolygonFeature,
	isFeatureCircle,
	isFeatureIcon,
	isFeatureLine,
	isFeaturePolygon,
	type MapObjectFeature
} from "@/lib/map/render/featureTypes";
import { getRenderer } from "@/lib/map/render/renderMapObjects";
import {
	allMapObjectTypes,
	ClientMapObjectType,
	type MapData,
	MapObjectType
} from "@/lib/mapObjects/mapObjectTypes";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { rangeCircle } from "@/lib/utils/rangeGeometry";
import { getFocusedRouteMapId, setFocusedRouteMapId } from "$lib/features/focusedRoute.svelte.js";
import { routeStartsAt } from "@/lib/utils/routeUtils";

type FeatureEntry = {
	lat: number;
	lon: number;
	data: MapData;
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
let nextFeatureExpiry = Infinity;
let renderedRevision: number | undefined;

export function needsFeatureUpdate() {
	return renderedRevision !== getMapObjectsRevision() || nextFeatureExpiry < currentTimestamp();
}

function getEmptyFeatures(): Features {
	return allMapObjectTypes.reduce((acc, val) => {
		acc[val] = {};
		return acc;
	}, {} as Features);
}

function publishFeatures() {
	const flattened = Object.values(features)
		.flatMap((family) => Object.values(family))
		.flatMap((entry) => entry.features);
	nextFeatureExpiry = Infinity;
	// Include route endpoints hidden by real forts; they can become visible again later.
	for (const feature of flattened) {
		if ("expires" in feature.properties && feature.properties.expires) {
			nextFeatureExpiry = Math.min(nextFeatureExpiry, feature.properties.expires);
		}
	}
	const actualForts = new Set(
		flattened
			.filter(
				(feature) =>
					isFeatureIcon(feature) &&
					!feature.properties.routeEndpointFortId &&
					(feature.properties.id.startsWith(`${MapObjectType.POKESTOP}-`) ||
						feature.properties.id.startsWith(`${MapObjectType.GYM}-`))
			)
			.map((feature) => feature.properties.id)
	);
	const routeEndpoints = new Set<string>();
	updateMapObjectsGeoJson(
		flattened.filter((feature) => {
			if (!isFeatureIcon(feature) || !feature.properties.routeEndpointFortId) return true;
			if (actualForts.has(feature.properties.id) || routeEndpoints.has(feature.properties.id)) {
				return false;
			}
			routeEndpoints.add(feature.properties.id);
			return true;
		})
	);
}

export function deleteAllFeaturesOfType(type: MapObjectType) {
	// Unsupported optional families can be cleared on every poll without changing the map.
	if (Object.keys(features[type]).length === 0) return;
	renderedRevision = undefined;
	features[type] = {};
}

export function deleteAllFeatures() {
	renderedRevision = undefined;
	nextFeatureExpiry = Infinity;
	selectedFeatures = [];
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
	publishFeatures();
}

function getActionRadiusFeatures(
	type: MapObjectType,
	mapId: string,
	center: [number, number],
	isSelected = false
) {
	const action = getUserSettings().actions[type]?.radius;
	if (!action) return [];

	const hasMapOverride = action.mapIds.includes(mapId);
	const shouldShow = action.all ? !hasMapOverride : hasMapOverride;
	if (!shouldShow) return [];

	const isPokemon = type === MapObjectType.POKEMON;
	const radii: { radius: number; fillColor: string }[] = [];
	if (isPokemon) {
		if (action.extraRadius) {
			radii.push({ radius: RANGE_POKEMON_EXTENDED, fillColor: "rgba(96, 165, 250, 0.2)" });
		}
		radii.push({ radius: RANGE_POKEMON, fillColor: "rgba(59, 130, 246, 0.2)" });
	} else if ([MapObjectType.POKESTOP, MapObjectType.GYM, MapObjectType.STATION].includes(type)) {
		radii.push({ radius: RANGE_FORTS, fillColor: RADIUS_FILL });
	}

	return radii.map(({ radius, fillColor }) => {
		const feature = rangeCircle(center, radius, { steps: 96 });

		return getPolygonFeature(`${mapId}-radius-${radius}`, [feature.geometry.coordinates], {
			id: mapId,
			strokeColor: isPokemon ? "transparent" : RADIUS_STROKE,
			fillColor,
			selectedFill: isPokemon ? fillColor : RADIUS_FILL_SELECTED,
			isSelected,
			isActionRadius: true
		});
	});
}

export function updateRadiusFeatures() {
	for (const type of allMapObjectTypes) {
		for (const [mapId, entry] of Object.entries(features[type])) {
			entry.features = entry.features.filter(
				(feature) => !(isFeaturePolygon(feature) && feature.properties.isActionRadius)
			);
			entry.features.unshift(...getActionRadiusFeatures(type, mapId, [entry.lon, entry.lat]));
		}
	}
	updateSelected(getCurrentSelectedData());
}

export function updateSelected(currentSelected: MapData | null) {
	// TODO base the scale on original modifiers, not the current size
	for (const feature of selectedFeatures) {
		if (isFeatureIcon(feature) || isFeatureCircle(feature)) {
			feature.properties.selectedScale = 1;
		} else if (isFeaturePolygon(feature)) {
			feature.properties.isSelected = false;
		}
	}
	selectedFeatures = [];

	if (currentSelected && currentSelected.type !== ClientMapObjectType.LOCATION) {
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

	syncRouteLineFeatures(currentSelected);

	publishFeatures();
}

function syncRouteLineFeatures(currentSelected: MapData | null) {
	const focusedRouteMapId = getFocusedRouteMapId();
	const showAllRoutes = getUserSettings().filters?.route?.enabled ?? false;
	const selectedRouteMapId =
		currentSelected?.type === MapObjectType.ROUTE ? currentSelected.mapId : undefined;
	const selectedFort =
		currentSelected?.type === MapObjectType.POKESTOP || currentSelected?.type === MapObjectType.GYM
			? currentSelected
			: undefined;

	for (const [mapId, entry] of Object.entries(features[MapObjectType.ROUTE])) {
		const line = entry.features.find(isFeatureLine);
		if (!line) continue;
		for (const feature of entry.features) {
			if (isFeatureIcon(feature) && feature.properties.routeEndpointFortId) {
				feature.properties.selectedScale =
					selectedFort?.mapId === feature.properties.id ? SELECTED_MAP_OBJECT_SCALE : 1;
			}
		}

		const startsAtSelectedFort =
			selectedFort !== undefined &&
			routeStartsAt(
				{
					start: { id: line.properties.startFortId },
					end: { id: line.properties.endFortId },
					reversible: line.properties.reversible
				},
				selectedFort.id
			);
		const isSelectedRoute = selectedRouteMapId === mapId;
		const isFocusedRoute = focusedRouteMapId === mapId;

		line.properties.isHighlighted =
			(showAllRoutes && startsAtSelectedFort) || isSelectedRoute || isFocusedRoute;
		line.properties.isDimmed = selectedRouteMapId !== undefined && !isSelectedRoute;
		line.properties.isVisible = focusedRouteMapId
			? isFocusedRoute
			: showAllRoutes || isSelectedRoute;
	}
}

export function refreshRouteFeatures() {
	syncRouteLineFeatures(getCurrentSelectedData());
	publishFeatures();
}

export function updateFeatures(
	mapObjects: MapObjectsStateType,
	types: readonly MapObjectType[] = allMapObjectTypes
) {
	const selectedMapId = getCurrentSelectedData()?.mapId ?? "";

	const actions = getUserSettings().actions;
	const focusedRouteMapId = getFocusedRouteMapId();
	if (focusedRouteMapId && !mapObjects[focusedRouteMapId]) setFocusedRouteMapId(null);

	for (const type of allMapObjectTypes) {
		const thisFeatures = features[type];
		for (const [existingId, entry] of Object.entries(thisFeatures)) {
			const obj = mapObjects[existingId];
			// Payload changes can alter an icon even when the object hasn't moved.
			if (
				entry.features.find(
					(feature) =>
						"expires" in feature.properties &&
						feature.properties.expires &&
						feature.properties.expires < currentTimestamp()
				) ||
				!obj ||
				entry.data !== obj ||
				entry.lon !== obj.lon ||
				entry.lat !== obj.lat
			) {
				selectedFeatures = selectedFeatures.filter((feature) => !entry.features.includes(feature));
				delete features[type][existingId];
			}
		}
	}

	for (const obj of Object.values(mapObjects)) {
		if (!types.includes(obj.type) || features[obj.type][obj.mapId]) continue;

		const isSelectedOverwrite = isCurrentSelectedOverwrite(obj.mapId);
		const isSelected = obj.mapId === selectedMapId;

		const renderer = getRenderer(obj.type);
		const subFeatures = renderer.render(obj, isSelected, isSelectedOverwrite);

		for (const feature of subFeatures) {
			if (isFeatureIcon(feature)) {
				feature.properties.dimmed = actions[obj.type]?.dimmed.mapIds.includes(obj.mapId) ?? false;
			}
		}

		subFeatures.unshift(
			...getActionRadiusFeatures(obj.type, obj.mapId, [obj.lon, obj.lat], isSelected)
		);

		features[obj.type][obj.mapId] = {
			data: obj,
			lat: obj.lat,
			lon: obj.lon,
			features: subFeatures
		};
		if (isSelected) selectedFeatures = [...selectedFeatures, ...subFeatures];
	}
	syncRouteLineFeatures(getCurrentSelectedData());
	publishFeatures();
	// A partial publication may defer invalidated or preserved popup companions until the batch settles.
	renderedRevision = allMapObjectTypes.every((type) => types.includes(type))
		? getMapObjectsRevision()
		: undefined;
}
