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
import { getModifiers, withVisualTransform } from "@/lib/map/modifierLayout";

import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { getStationPokemon, shouldDisplayStation } from "@/lib/utils/stationUtils";
import {
	getActivePokestopFilter,
	hasFortActiveLure,
	isIncidentInvasion,
	parseQuestReward,
	shouldDisplayIncidient,
	shouldDisplayQuest
} from "@/lib/utils/pokestopUtils";
import { getActiveGymFilter, getRaidPokemon, shouldDisplayRaid } from "@/lib/utils/gymUtils";
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { resize } from "@/lib/services/assets";
import { geojson, s2 } from "s2js";
import { shouldDisplayNest } from "@/lib/utils/nestUtils";
import {
	getModifierOverlayIconUrl,
	getModifierOverlayImageSize,
	getEmojiImageUrl,
	BADGE_SCALE_RATIO,
	getBadgeOffset
} from "@/lib/map/modifierOverlayIcons";
import type {
	BaseFilterset,
	FiltersetInvasion,
	FiltersetModifiers,
	FiltersetPokemon,
	FiltersetQuest,
	FiltersetRaid
} from "@/lib/features/filters/filtersets";
import { getIcon } from "@/lib/features/filters/icons";
import {
	getMatchingInvasionFilterset,
	getMatchingPokemonFilterset,
	getMatchingQuestFilterset,
	getMatchingRaidFilterset
} from "@/lib/features/filters/matchFilterset";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import {
	MODIFIER_BACKGROUND_OPACITY,
	MODIFIER_GLOW_OPACITY,
	MODIFIER_GLOW_RADIUS
} from "@/lib/features/filters/modifierPresets";

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
	imageRotation?: number;
	isUnderlay?: boolean;
	isAttachedBadge?: boolean;
	textLabel?: string;
	renderStateKey?: string;
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

function getIconFeature(
	id: string,
	coordinates: Point["coordinates"],
	properties: Omit<MapObjectIconProperties, "type">
): MapObjectIconFeature {
	let imageUrl = properties.imageUrl;
	if (!imageUrl.startsWith("data:")) {
		imageUrl = resize(imageUrl, { width: 64 });
	}

	return {
		type: "Feature",
		geometry: {
			type: "Point",
			coordinates
		},
		properties: {
			...properties,
			imageUrl,
			type: MapObjectFeatureType.ICON
		},
		id
	};
}

function getPolygonFeature(
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

function getCircleFeature(
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


function addModifierOverlayFeatures(
	subFeatures: MapObjectFeature[],
	mapFeatureId: string,
	mapId: string,
	coordinates: Point["coordinates"],
	selectedScale: number,
	imageSize: number,
	filtersetModifiers: FiltersetModifiers | undefined,
	imageOffset: number[] = [0, 0]
) {
	if (!filtersetModifiers) return;

	// Modifier underlays use the same icon-offset model as the icon they belong to.

	if (filtersetModifiers.background) {
		subFeatures.push(
			getIconFeature(`${mapFeatureId}-background`, coordinates, {
				id: mapId,
				imageUrl: getModifierOverlayIconUrl(
					"background",
					filtersetModifiers.background.color,
					filtersetModifiers.background.opacity ?? MODIFIER_BACKGROUND_OPACITY
				),
				imageSize: getModifierOverlayImageSize(imageSize, 1.1),
				selectedScale,
				imageOffset,
				isUnderlay: true,
				expires: null
			})
		);
	}

	if (filtersetModifiers.glow) {
		subFeatures.push(
			getIconFeature(`${mapFeatureId}-glow`, coordinates, {
				id: mapId,
				imageUrl: getModifierOverlayIconUrl(
					"glow",
					filtersetModifiers.glow.color,
					filtersetModifiers.glow.opacity ?? MODIFIER_GLOW_OPACITY
				),
				imageSize: getModifierOverlayImageSize(
					imageSize,
					filtersetModifiers.glow.radius ?? MODIFIER_GLOW_RADIUS
				),
				selectedScale,
				imageOffset,
				isUnderlay: true,
				expires: null
			})
		);
	}
}

// QuestReward is a wide discriminated union — keep loose typing to avoid narrowing at each call site
function getRewardIconInfo(reward: { info: { [key: string]: any } }) {
	return {
		item_id: reward.info.item_id,
		pokemon_id: reward.info.pokemon_id,
		form: reward.info.form ?? reward.info.form_id ?? undefined,
		amount: reward.info.amount
	};
}


function resolveFiltersetBadgeIconUrl(icon: BaseFilterset["icon"]): string | undefined {
	if (icon.uicon) {
		return getIcon(icon.uicon.category, icon.uicon.params);
	}
	if (icon.emoji) {
		return getEmojiImageUrl(icon.emoji);
	}
	return undefined;
}

function getTextLabel(filtersetModifiers: FiltersetModifiers | undefined): string | undefined {
	if (!filtersetModifiers?.showLabel) return undefined;
	return filtersetModifiers.showLabel;
}

function addFiltersetBadgeFeature(
	subFeatures: MapObjectFeature[],
	featureId: string,
	mapId: string,
	coordinates: Point["coordinates"],
	filtersetModifiers: FiltersetModifiers | undefined,
	filtersetIcon: BaseFilterset["icon"] | undefined,
	imageSize: number,
	selectedScale: number,
	modifiers: { offsetX: number; offsetY: number },
	expires: number | null
) {
	if (!filtersetModifiers?.showBadge || !filtersetIcon) return;
	const badgeUrl = resolveFiltersetBadgeIconUrl(filtersetIcon);
	if (!badgeUrl) return;

	subFeatures.push(
		getIconFeature(featureId, coordinates, {
			imageUrl: badgeUrl,
			id: mapId,
			imageSize: imageSize * BADGE_SCALE_RATIO,
			selectedScale: selectedScale,
			imageOffset: getBadgeOffset(modifiers.offsetX, modifiers.offsetY),
			isAttachedBadge: true,
			expires
		})
	);
}

function getFiltersetModifierStateKey(filtersetModifiers: FiltersetModifiers | undefined) {
	if (!filtersetModifiers) return "";

	return JSON.stringify({
		background: filtersetModifiers.background?.color ?? null,
		glow: filtersetModifiers.glow?.color ?? null,
		rotation: filtersetModifiers.rotation ?? null,
		scale: filtersetModifiers.scale ?? null
	});
}

function getPokemonFeatureStateKey(
	data: PokemonData,
	filtersetModifiers: FiltersetModifiers | undefined
) {
	return [
		data.expire_timestamp ?? "",
		getFiltersetModifierStateKey(filtersetModifiers)
	].join("|");
}

function getRenderedPokemonFeatureStateKey(mapId: string) {
	const pokemonFeatures = features[MapObjectType.POKEMON][mapId] ?? [];

	for (const feature of pokemonFeatures) {
		if (!isFeatureIcon(feature)) continue;
		if (feature.properties.renderStateKey !== undefined) {
			return feature.properties.renderStateKey;
		}
	}

	return "";
}

function shouldRegeneratePokemonFeatures(
	data: PokemonData,
	filtersetModifiers: FiltersetModifiers | undefined
) {
	if (!features[MapObjectType.POKEMON][data.mapId]) return true;
	return (
		getRenderedPokemonFeatureStateKey(data.mapId) !==
		getPokemonFeatureStateKey(data, filtersetModifiers)
	);
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

	const pokemonFiltersets: FiltersetPokemon[] = getUserSettings().filters.pokemon.filters;
	const raidFiltersets: FiltersetRaid[] = getActiveGymFilter().raid.filters;
	const questFiltersets: FiltersetQuest[] = getActivePokestopFilter().quest.filters;
	const invasionFiltersets: FiltersetInvasion[] = getActivePokestopFilter().invasion.filters;

	const iconSets = getCurrentUiconSetDetailsAllTypes();
	const timestamp = currentTimestamp();

	const selectedMapId = getCurrentSelectedData()?.mapId ?? "";
	// const allCurrentMapIds = Object.keys(mapObjects);
	// const allFeatureMapIds = flattenFeatures().map(f => f.properties.id)

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

	// const loopTime = performance.now();

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
			if (!shouldRegeneratePokemonFeatures(obj as PokemonData, iconFiltersetModifiers)) continue;
		} else if (features[obj.type][obj.mapId]) {
			continue;
		}

		const iconType = obj.type === MapObjectType.NEST ? MapObjectType.POKEMON : obj.type;

		const userIconSet = iconSets[iconType];
		let overwriteIcon: string | undefined = undefined;
		let showThis: boolean = true;
		const modifiers = getModifiers(userIconSet, iconType);
		let expires = null;
		let pokemonRenderStateKey: string | undefined = undefined;

		const subFeatures: MapObjectFeature[] = [];

		const isSelectedOverwrite = isCurrentSelectedOverwrite(obj.mapId);
		const isSelected = obj.mapId === selectedMapId;
		const selectedScale = isSelected ? SELECTED_MAP_OBJECT_SCALE : 1;

		if (obj.type === MapObjectType.POKESTOP) {
			showThis =
				showAllPokestops ||
				(showLures && hasFortActiveLure(obj)) ||
				isSelected ||
				isSelectedOverwrite;
			if (showQuests || isSelectedOverwrite) {
				const questModifiers = getModifiers(userIconSet, "quest");
				if (obj.alternative_quest_target && obj.alternative_quest_rewards) {
					// no ar
					const reward = parseQuestReward(obj.alternative_quest_rewards);

					if (
						!reward ||
						!shouldDisplayQuest(
							reward,
							obj.alternative_quest_title ?? "",
							obj.alternative_quest_target,
							false,
							obj
						)
					)
						continue;
					showThis = true;

					const mapId = obj.mapId + "-altquest-" + obj.alternative_quest_timestamp;
					const matchingQuestFilterset = getMatchingQuestFilterset(
						reward,
						obj.alternative_quest_title ?? "",
						obj.alternative_quest_target,
						false,
						questFiltersets
					);
					const questVisual = withVisualTransform(
						questModifiers.scale,
						matchingQuestFilterset?.modifiers
					);
					const questImageOffset = [
						modifiers.offsetX + questModifiers.offsetX,
						modifiers.offsetY + questModifiers.offsetY
					];

					addModifierOverlayFeatures(
						subFeatures,
						mapId,
						obj.mapId,
						[obj.lon, obj.lat],
						selectedScale,
						questVisual.imageSize,
						matchingQuestFilterset?.modifiers,
						questImageOffset
					);

					{
						const questLabel = getTextLabel(
							matchingQuestFilterset?.modifiers
						);
						subFeatures.push(
							getIconFeature(mapId, [obj.lon, obj.lat], {
								imageUrl: getIconReward(reward.type, getRewardIconInfo(reward)),
								imageSize: questVisual.imageSize,
								selectedScale: selectedScale,
								imageOffset: questImageOffset,
								...(questVisual.imageRotation !== undefined && {
									imageRotation: questVisual.imageRotation
								}),
								...(questLabel !== undefined && { textLabel: questLabel }),
								id: obj.mapId,
								expires: obj.alternative_quest_expiry ?? null
							})
						);
					}
					addFiltersetBadgeFeature(
						subFeatures,
						`${mapId}-badge`,
						obj.mapId,
						[obj.lon, obj.lat],
						matchingQuestFilterset?.modifiers,
						matchingQuestFilterset?.icon,
						questVisual.imageSize,
						selectedScale,
						{ offsetX: questImageOffset[0], offsetY: questImageOffset[1] },
						obj.alternative_quest_expiry ?? null
					);
				}
				if (obj.quest_target && obj.quest_rewards) {
					// ar
					const reward = parseQuestReward(obj.quest_rewards);
					if (
						!reward ||
						!shouldDisplayQuest(reward, obj.quest_title ?? "", obj.quest_target, true, obj)
					)
						continue;
					showThis = true;

					const mapId = obj.mapId + "-quest-" + obj.quest_timestamp;
					const spacing = subFeatures.length === 0 ? 0 : questModifiers.spacing;
					const matchingQuestFilterset = getMatchingQuestFilterset(
						reward,
						obj.quest_title ?? "",
						obj.quest_target,
						true,
						questFiltersets
					);
					const questVisual = withVisualTransform(
						questModifiers.scale,
						matchingQuestFilterset?.modifiers
					);
					const questImageOffset = [
						modifiers.offsetX + questModifiers.offsetX,
						modifiers.offsetY + questModifiers.offsetY + spacing
					];

					addModifierOverlayFeatures(
						subFeatures,
						mapId,
						obj.mapId,
						[obj.lon, obj.lat],
						selectedScale,
						questVisual.imageSize,
						matchingQuestFilterset?.modifiers,
						questImageOffset
					);

					{
						const questLabel = getTextLabel(
							matchingQuestFilterset?.modifiers
						);
						subFeatures.push(
							getIconFeature(mapId, [obj.lon, obj.lat], {
								imageUrl: getIconReward(reward.type, getRewardIconInfo(reward)),
								imageSize: questVisual.imageSize,
								selectedScale: selectedScale,
								imageOffset: questImageOffset,
								...(questVisual.imageRotation !== undefined && {
									imageRotation: questVisual.imageRotation
								}),
								...(questLabel !== undefined && { textLabel: questLabel }),
								id: obj.mapId,
								expires: obj.quest_expiry ?? null
							})
						);
					}
					addFiltersetBadgeFeature(
						subFeatures,
						`${mapId}-badge`,
						obj.mapId,
						[obj.lon, obj.lat],
						matchingQuestFilterset?.modifiers,
						matchingQuestFilterset?.icon,
						questVisual.imageSize,
						selectedScale,
						{ offsetX: questImageOffset[0], offsetY: questImageOffset[1] },
						obj.quest_expiry ?? null
					);
				}
			}

			let index = 0;
			for (const incident of obj?.incident ?? []) {
				if (shouldDisplayIncidient(incident, obj)) {
					showThis = true;
				} else {
					continue;
				}

				if (
					!(
						(showInvasions &&
							incident.id &&
							isIncidentInvasion(incident) &&
							incident.expiration > timestamp) ||
						isSelectedOverwrite
					)
				) {
					continue;
				}

				const mapId = obj.mapId + "-incident-" + incident.id;
				const invasionModifiers = getModifiers(userIconSet, "invasion");
				const matchingInvasionFilterset = getMatchingInvasionFilterset(
					incident,
					invasionFiltersets
				);
				const invasionVisual = withVisualTransform(
					invasionModifiers.scale,
					matchingInvasionFilterset?.modifiers
				);
				const invasionImageOffset = [
					modifiers.offsetX + invasionModifiers.offsetX,
					modifiers.offsetY + invasionModifiers.offsetY + index * invasionModifiers.spacing
				];

				addModifierOverlayFeatures(
					subFeatures,
					mapId,
					obj.mapId,
					[obj.lon, obj.lat],
					selectedScale,
					invasionVisual.imageSize,
					matchingInvasionFilterset?.modifiers,
					invasionImageOffset
				);

				{
					const invasionLabel = getTextLabel(
						matchingInvasionFilterset?.modifiers
					);
					subFeatures.push(
						getIconFeature(mapId, [obj.lon, obj.lat], {
							imageUrl: getIconInvasion(incident.character, incident.confirmed),
							imageSize: invasionVisual.imageSize,
							selectedScale: selectedScale,
							imageOffset: invasionImageOffset,
							...(invasionVisual.imageRotation !== undefined && {
								imageRotation: invasionVisual.imageRotation
							}),
							...(invasionLabel !== undefined && { textLabel: invasionLabel }),
							id: obj.mapId,
							expires: incident.expiration
						})
					);
				}
				addFiltersetBadgeFeature(
					subFeatures,
					`${mapId}-badge`,
					obj.mapId,
					[obj.lon, obj.lat],
					matchingInvasionFilterset?.modifiers,
					matchingInvasionFilterset?.icon,
					invasionVisual.imageSize,
					selectedScale,
					{ offsetX: invasionImageOffset[0], offsetY: invasionImageOffset[1] },
					incident.expiration
				);
				index += 1;
			}
		} else if (obj.type === MapObjectType.GYM) {
			showThis = showAllGyms || shouldDisplayRaid(obj) || isSelected || isSelectedOverwrite;
			const matchingRaidFilterset = shouldDisplayRaid(obj)
				? getMatchingRaidFilterset(obj as GymData, raidFiltersets)
				: undefined;

			if ((obj.updated ?? 0) < timestamp - FORT_OUTDATED_SECONDS) {
				overwriteIcon = getIconGym({ team_id: 0 });
			} else if (shouldDisplayRaid(obj)) {
				if (obj.raid_pokemon_id) {
					const mapId = obj.mapId + "-raidpokemon-" + obj.raid_spawn_timestamp;
					const pokemonModifiers = getModifiers(userIconSet, "pokemon");
					let raidModifiers = getModifiers(userIconSet, "raid_pokemon");

					if (obj.availble_slots === 0 && userIconSet?.raid_pokemon_6) {
						raidModifiers = getModifiers(userIconSet, "raid_pokemon_6");
					}

					const raidImageOffset = [
						modifiers.offsetX + raidModifiers.offsetX,
						modifiers.offsetY + raidModifiers.offsetY
					];
					const raidVisual = withVisualTransform(
						pokemonModifiers.scale * raidModifiers.scale,
						matchingRaidFilterset?.modifiers
					);

					addModifierOverlayFeatures(
						subFeatures,
						mapId,
						obj.mapId,
						[obj.lon, obj.lat],
						selectedScale,
						raidVisual.imageSize,
						matchingRaidFilterset?.modifiers,
						raidImageOffset
					);

					{
						const raidLabel = getTextLabel(
							matchingRaidFilterset?.modifiers
						);
						subFeatures.push(
							getIconFeature(mapId, [obj.lon, obj.lat], {
								imageUrl: getIconPokemon(getRaidPokemon(obj)),
								imageSize: raidVisual.imageSize,
								selectedScale: selectedScale,
								imageOffset: raidImageOffset,
								...(raidVisual.imageRotation !== undefined && {
									imageRotation: raidVisual.imageRotation
								}),
								...(raidLabel !== undefined && { textLabel: raidLabel }),
								id: obj.mapId,
								expires: obj.raid_end_timestamp ?? null
							})
						);
					}
					addFiltersetBadgeFeature(
						subFeatures,
						`${mapId}-badge`,
						obj.mapId,
						[obj.lon, obj.lat],
						matchingRaidFilterset?.modifiers,
						matchingRaidFilterset?.icon,
						raidVisual.imageSize,
						selectedScale,
						{ offsetX: raidImageOffset[0], offsetY: raidImageOffset[1] },
						obj.raid_end_timestamp ?? null
					);
				} else {
					const mapId = obj.mapId + "-raidegg-" + obj.raid_spawn_timestamp;
					let raidModifiers = getModifiers(userIconSet, "raid_egg");

					if (obj.availble_slots === 0 && userIconSet?.raid_egg_6) {
						raidModifiers = getModifiers(userIconSet, "raid_egg_6");
					}

					const raidImageOffset = [
						modifiers.offsetX + raidModifiers.offsetX,
						modifiers.offsetY + raidModifiers.offsetY
					];
					const raidVisual = withVisualTransform(
						raidModifiers.scale,
						matchingRaidFilterset?.modifiers
					);

					addModifierOverlayFeatures(
						subFeatures,
						mapId,
						obj.mapId,
						[obj.lon, obj.lat],
						selectedScale,
						raidVisual.imageSize,
						matchingRaidFilterset?.modifiers,
						raidImageOffset
					);

					{
						const raidLabel = getTextLabel(
							matchingRaidFilterset?.modifiers
						);
						subFeatures.push(
							getIconFeature(mapId, [obj.lon, obj.lat], {
								imageUrl: getIconRaidEgg(obj.raid_level ?? 0),
								imageSize: raidVisual.imageSize,
								selectedScale: selectedScale,
								imageOffset: raidImageOffset,
								...(raidVisual.imageRotation !== undefined && {
									imageRotation: raidVisual.imageRotation
								}),
								...(raidLabel !== undefined && { textLabel: raidLabel }),
								id: obj.mapId,
								expires: obj.raid_battle_timestamp ?? null
							})
						);
					}
					addFiltersetBadgeFeature(
						subFeatures,
						`${mapId}-badge`,
						obj.mapId,
						[obj.lon, obj.lat],
						matchingRaidFilterset?.modifiers,
						matchingRaidFilterset?.icon,
						raidVisual.imageSize,
						selectedScale,
						{ offsetX: raidImageOffset[0], offsetY: raidImageOffset[1] },
						obj.raid_battle_timestamp ?? null
					);
				}
			}
		} else if (obj.type === MapObjectType.POKEMON) {
			if (obj.expire_timestamp && obj.expire_timestamp < timestamp) continue;
			expires = obj.expire_timestamp;
			pokemonRenderStateKey = getPokemonFeatureStateKey(obj as PokemonData, iconFiltersetModifiers);
		} else if (obj.type === MapObjectType.STATION) {
			showThis = false;
			if (shouldDisplayStation(obj)) {
				expires = obj.end_time;
				showThis = true;
				if (obj.battle_pokemon_id) {
					const mapId = obj.mapId + "-maxbattle-" + obj.battle_pokemon_id;
					const maxBattleModifiers = getModifiers(userIconSet, "max_battle");

					subFeatures.push(
						getIconFeature(mapId, [obj.lon, obj.lat], {
							imageUrl: getIconPokemon(getStationPokemon(obj)),
							imageSize: maxBattleModifiers.scale,
							selectedScale: selectedScale,
							imageOffset: [
								modifiers.offsetX + maxBattleModifiers.offsetX,
								modifiers.offsetY + maxBattleModifiers.offsetY
							],
							id: obj.mapId,
							expires: obj.end_time ?? null
						})
					);
				}
			}
		} else if (obj.type === MapObjectType.NEST) {
			showThis = false;

			if (shouldDisplayNest(obj)) {
				// this is ugly code to transform mysqls's weird polygon format to geojson
				let polygon: MultiPolygon["coordinates"];
				if (Array.isArray(obj.polygon[0][0])) {
					polygon = obj.polygon.map((polygon) =>
						// @ts-ignore
						polygon.map((ring) => ring.map((p) => [p.x, p.y]))
					);
				} else {
					// @ts-ignore
					polygon = [obj.polygon.map((ring) => ring.map((p) => [p.x, p.y]))];
				}

				subFeatures.push(
					getIconFeature(obj.mapId, [obj.lon, obj.lat], {
						imageUrl: getIconPokemon(obj),
						id: obj.mapId,
						imageSize: modifiers.scale,
						selectedScale: selectedScale,
						imageOffset: [modifiers.offsetX, modifiers.offsetY],
						expires
					})
				);

				subFeatures.push(
					getCircleFeature(obj.mapId, [obj.lon, obj.lat], {
						id: obj.mapId,
						strokeColor: styles.getPropertyValue("--nest-circle-stroke"),
						fillColor: styles.getPropertyValue("--nest-circle"),
						radius: 52 * modifiers.scale,
						selectedScale: selectedScale
					})
				);
				subFeatures.push(
					getPolygonFeature(obj.mapId, polygon, {
						id: obj.mapId,
						strokeColor: styles.getPropertyValue("--nest-polygon-stroke"),
						fillColor: styles.getPropertyValue("--nest-polygon"),
						selectedFill: styles.getPropertyValue("--nest-polygon-selected"),
						isSelected
					})
				);
			}
		} else if (obj.type === MapObjectType.SPAWNPOINT) {
			showThis = false;
			const isOutdated = obj.last_seen < timestamp - SPAWNPOINT_OUTDATED_SECONDS;
			let cssVar = "--spawnpoint";
			if (isOutdated) cssVar += "-inactive";

			subFeatures.push(
				getCircleFeature(obj.mapId, [obj.lon, obj.lat], {
					id: obj.mapId,
					strokeColor: styles.getPropertyValue(cssVar + "-stroke"),
					fillColor: styles.getPropertyValue(cssVar),
					radius: 3,
					selectedScale: selectedScale
				})
			);
		} else if (obj.type === MapObjectType.ROUTE) {
		} else if (obj.type === MapObjectType.TAPPABLE) {
			if (obj.expire_timestamp && obj.expire_timestamp < timestamp) continue;
			expires = obj.expire_timestamp;
		} else if (obj.type === MapObjectType.S2_CELL) {
			showThis = false;
			const cell = s2.Cell.fromCellID(obj.cellId);
			const polygon = geojson.toGeoJSON(cell) as Polygon;
			subFeatures.push(
				getPolygonFeature(obj.mapId, [polygon.coordinates], {
					id: obj.mapId,
					strokeColor: styles.getPropertyValue("--s2cell-polygon-stroke"),
					fillColor: styles.getPropertyValue("--s2cell-polygon"),
					selectedFill: styles.getPropertyValue("--s2cell-polygon-selected"),
					isSelected
				})
			);
		}

		// subFeatures.push(
		// 	getIconFeature("debug-red-dot", [obj.lon, obj.lat], {
		// 		imageUrl:
		// 			"https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Red_Circle%28small%29.svg/29px-Red_Circle%28small%29.svg.png",
		// 		id: obj.mapId,
		// 		imageSize: 0.05,
		// 		expires: null,
		// 		selectedScale: 1
		// 	})
		// );

		if (showThis) {
			const iconVisual = withVisualTransform(modifiers.scale, iconFiltersetModifiers);
			addModifierOverlayFeatures(
				subFeatures,
				obj.mapId,
				obj.mapId,
				[obj.lon, obj.lat],
				selectedScale,
				iconVisual.imageSize,
				iconFiltersetModifiers
			);

			const textLabel = getTextLabel(iconFiltersetModifiers);

			subFeatures.push(
				getIconFeature(obj.mapId, [obj.lon, obj.lat], {
					imageUrl: overwriteIcon ?? getIconForMap(obj),
					id: obj.mapId,
					imageSize: iconVisual.imageSize,
					selectedScale: selectedScale,
					imageOffset: [modifiers.offsetX, modifiers.offsetY],
					...(iconVisual.imageRotation !== undefined && {
						imageRotation: iconVisual.imageRotation
					}),
					...(pokemonRenderStateKey !== undefined && {
						renderStateKey: pokemonRenderStateKey
					}),
					...(textLabel !== undefined && { textLabel }),
					expires
				})
			);

			if (iconFiltersetModifiers?.showBadge && matchedFiltersetIcon) {
				const badgeOffset = getBadgeOffset(modifiers.offsetX, modifiers.offsetY);
				const badgeSize = iconVisual.imageSize * BADGE_SCALE_RATIO;
				const badgeUrl = resolveFiltersetBadgeIconUrl(matchedFiltersetIcon);
				if (badgeUrl) {
					subFeatures.push(
						getIconFeature(`${obj.mapId}-filterset-badge`, [obj.lon, obj.lat], {
							imageUrl: badgeUrl,
							id: obj.mapId,
							imageSize: badgeSize,
							selectedScale: selectedScale,
							imageOffset: badgeOffset,
							isAttachedBadge: true,
							expires
						})
					);
				}
			}
		}

		features[obj.type][obj.mapId] = subFeatures;
		if (obj.mapId === selectedMapId) selectedFeatures = [...selectedFeatures, ...subFeatures];
	}
	updateMapObjectsGeoJson(getFlattenedFeatures());
}
