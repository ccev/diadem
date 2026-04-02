import { type MapObjectsStateType } from "@/lib/mapObjects/mapObjectsState.svelte.js";
import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
import { SELECTED_MAP_OBJECT_SCALE } from "@/lib/constants";
import {
	getCurrentSelectedData,
	isCurrentSelectedOverwrite
} from "@/lib/mapObjects/currentSelectedState.svelte.js";
import { updateMapObjectsGeoJson } from "@/lib/map/featuresManage.svelte";
import { getModifiers, withVisualTransform } from "@/lib/map/modifierLayout";
import { getCurrentUiconSetDetailsAllTypes, getIconForMap } from "@/lib/services/uicons.svelte.js";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { getActivePokestopFilter, hasFortActiveLure } from "@/lib/utils/pokestopUtils";
import { getActiveGymFilter } from "@/lib/utils/gymUtils";
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { BaseFilterset, FiltersetModifiers } from "@/lib/features/filters/filtersets";
import { getMatchingPokemonFilterset } from "@/lib/features/filters/matchFilterset";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { StationData } from "@/lib/types/mapObjectData/station";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";
import type { S2CellData } from "@/lib/types/mapObjectData/s2cell";

import {
	type MapObjectFeature,
	isFeatureIcon,
	isFeatureCircle,
	isFeaturePolygon
} from "./render/featureBuilders";
import { addOverlayIconAndBadge, getTextLabel } from "./render/modifierFeatures";
import type { RenderContext, RenderResult } from "./render/renderTypes";
import { renderPokestop } from "./render/pokestopRenderer";
import { renderGym } from "./render/gymRenderer";
import { renderPokemon, shouldRegeneratePokemonFeatures } from "./render/pokemonRenderer";
import { renderNest } from "./render/nestRenderer";
import { renderStation, renderSpawnpoint, renderTappable, renderS2Cell } from "./render/miscRenderers";

// Re-export types and guards for existing consumers
export {
	MapObjectFeatureType,
	type MapObjectIconProperties,
	type MapObjectPolygonProperties,
	type MapObjectCircleProperties,
	type MapObjectIconFeature,
	type MapObjectPolygonFeature,
	type MapObjectCircleFeature,
	type MapObjectFeature,
	isFeatureIcon,
	isFeatureCircle,
	isFeaturePolygon
} from "./render/featureBuilders";

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
	const styles = getComputedStyle(document.documentElement);

	const showAllPokestops = getActivePokestopFilter().pokestopPlain.enabled;
	const showLures = getActivePokestopFilter().lure.enabled;
	const showQuests = getActivePokestopFilter().quest.enabled;
	const showInvasions = getActivePokestopFilter().invasion.enabled;
	const showAllGyms = getActiveGymFilter().gymPlain.enabled;

	const pokemonFiltersets = getUserSettings().filters.pokemon.filters;
	const raidFiltersets = getActiveGymFilter().raid.filters;
	const questFiltersets = getActivePokestopFilter().quest.filters;
	const invasionFiltersets = getActivePokestopFilter().invasion.filters;

	const iconSets = getCurrentUiconSetDetailsAllTypes();
	const timestamp = currentTimestamp();

	const selectedMapId = getCurrentSelectedData()?.mapId ?? "";

	for (const [type, thisFeatures] of Object.entries(features) as [
		MapObjectType,
		Features[MapObjectType]
	][]) {
		for (const [existingId, subFeatures] of Object.entries(thisFeatures)) {
			const hasExpiredIcons = subFeatures.some(
				(feature) =>
					isFeatureIcon(feature) &&
					Boolean(feature.properties.expires) &&
					(feature.properties.expires ?? 0) < timestamp
			);

			if (hasExpiredIcons || !(existingId in mapObjects)) {
				delete features[type][existingId];
			}
		}
	}

	for (const obj of Object.values(mapObjects)) {
		let iconFiltersetModifiers: FiltersetModifiers | undefined = undefined;
		let matchedFiltersetIcon: BaseFilterset["icon"] | undefined = undefined;

		if (obj.type === MapObjectType.POKEMON) {
			const matchedFilterset = getMatchingPokemonFilterset(
				obj as PokemonData,
				pokemonFiltersets
			);
			iconFiltersetModifiers = matchedFilterset?.modifiers;
			matchedFiltersetIcon = matchedFilterset?.icon;
			if (!shouldRegeneratePokemonFeatures(
				obj as PokemonData,
				iconFiltersetModifiers,
				features[MapObjectType.POKEMON]
			)) continue;
		} else if (features[obj.type][obj.mapId]) {
			continue;
		}

		const iconType = obj.type === MapObjectType.NEST ? MapObjectType.POKEMON : obj.type;
		const userIconSet = iconSets[iconType];
		const modifiers = getModifiers(userIconSet, iconType);

		const isSelectedOverwrite = isCurrentSelectedOverwrite(obj.mapId);
		const isSelected = obj.mapId === selectedMapId;
		const selectedScale = isSelected ? SELECTED_MAP_OBJECT_SCALE : 1;

		const ctx: RenderContext = {
			styles,
			timestamp,
			selectedScale,
			isSelectedOverwrite,
			isSelected,
			modifiers,
			userIconSet,
			pokemonFiltersets,
			raidFiltersets,
			questFiltersets,
			invasionFiltersets,
			showAllPokestops,
			showLures,
			showQuests,
			showInvasions,
			showAllGyms
		};

		let result: RenderResult | null = null;

		if (obj.type === MapObjectType.POKESTOP) {
			result = renderPokestop(obj as PokestopData, ctx);
		} else if (obj.type === MapObjectType.GYM) {
			result = renderGym(obj as GymData, ctx);
		} else if (obj.type === MapObjectType.POKEMON) {
			result = renderPokemon(obj as PokemonData, ctx, iconFiltersetModifiers);
		} else if (obj.type === MapObjectType.STATION) {
			result = renderStation(obj as StationData, ctx);
		} else if (obj.type === MapObjectType.NEST) {
			result = renderNest(obj as NestData, ctx);
		} else if (obj.type === MapObjectType.SPAWNPOINT) {
			result = renderSpawnpoint(obj as SpawnpointData, ctx);
		} else if (obj.type === MapObjectType.ROUTE) {
			result = { subFeatures: [], showThis: true, expires: null };
		} else if (obj.type === MapObjectType.TAPPABLE) {
			result = renderTappable(obj as TappableData, ctx);
		} else if (obj.type === MapObjectType.S2_CELL) {
			result = renderS2Cell(obj as S2CellData, ctx);
		}

		if (!result) continue;

		const {
			subFeatures,
			showThis,
			expires,
			overwriteIcon,
			pokemonRenderStateKey
		} = result;
		iconFiltersetModifiers = result.iconFiltersetModifiers ?? iconFiltersetModifiers;
		matchedFiltersetIcon = result.matchedFiltersetIcon ?? matchedFiltersetIcon;

		if (showThis) {
			const iconVisual = withVisualTransform(modifiers.scale, iconFiltersetModifiers);

			addOverlayIconAndBadge(subFeatures, obj.mapId, obj.mapId, [obj.lon, obj.lat], {
				imageUrl: overwriteIcon ?? getIconForMap(obj),
				imageSize: iconVisual.imageSize,
				selectedScale,
				imageOffset: [modifiers.offsetX, modifiers.offsetY],
				imageRotation: iconVisual.imageRotation,
				textLabel: getTextLabel(iconFiltersetModifiers),
				renderStateKey: pokemonRenderStateKey,
				expires,
				filtersetModifiers: iconFiltersetModifiers,
				filtersetIcon: matchedFiltersetIcon
			});
		}

		features[obj.type][obj.mapId] = subFeatures;
		if (obj.mapId === selectedMapId) selectedFeatures = [...selectedFeatures, ...subFeatures];
	}
	updateMapObjectsGeoJson(getFlattenedFeatures());
}
