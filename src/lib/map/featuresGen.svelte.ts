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
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { showRoutePaths, clearRoutePaths, getRouteAnchorFortId } from "@/lib/map/routePaths.svelte";

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
	routeCount?: number;
	fortId?: string;
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

export type RouteLocationGroup = { lat: number; lon: number; routes: RouteData[] };
// Keyed by fort_id — merges routes that start AND end at the same fort
let routeFortGroups = new Map<string, RouteLocationGroup>();

export function getRoutesAtFort(fortId: string): RouteData[] {
	return routeFortGroups.get(fortId)?.routes ?? [];
}

export function getRouteFortGroupForRoute(route: RouteData): RouteLocationGroup | undefined {
	// Check start fort first, then end fort
	const startGroup = routeFortGroups.get(route.start_fort_id);
	if (startGroup && startGroup.routes.includes(route)) return startGroup;
	const endGroup = routeFortGroups.get(route.end_fort_id);
	if (endGroup && endGroup.routes.includes(route)) return endGroup;
	return undefined;
}

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

function getModifiers(iconSet: UiconSet | undefined, type: UiconSetModifierType) {
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

		if (currentSelected.type === MapObjectType.ROUTE) {
			const route = currentSelected as RouteData;
			const fortId = getRouteAnchorFortId();
			const group = fortId ? routeFortGroups.get(fortId) : getRouteFortGroupForRoute(route);
			showRoutePaths(group?.routes ?? [route], route.mapId);
		}
	} else {
		clearRoutePaths();
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

	// Group routes by fort — a fort can be both a start and end location
	routeFortGroups = new Map<string, RouteLocationGroup>();
	for (const obj of Object.values(mapObjects)) {
		if (obj.type !== MapObjectType.ROUTE) continue;
		const route = obj as RouteData;

		if (!routeFortGroups.has(route.start_fort_id)) {
			routeFortGroups.set(route.start_fort_id, {
				lat: route.start_lat, lon: route.start_lon, routes: []
			});
		}
		const startGroup = routeFortGroups.get(route.start_fort_id)!;
		if (!startGroup.routes.includes(route)) startGroup.routes.push(route);

		if (route.reversible === 1) {
			if (!routeFortGroups.has(route.end_fort_id)) {
				routeFortGroups.set(route.end_fort_id, {
					lat: route.end_lat, lon: route.end_lon, routes: []
				});
			}
			const endGroup = routeFortGroups.get(route.end_fort_id)!;
			if (!endGroup.routes.includes(route)) endGroup.routes.push(route);
		}
	}

	// Track which forts already have an icon (to avoid duplicates from multiple routes)
	const routeFortIconCreated = new Set<string>();

	// Route icons depend on full group counts, so always regenerate them
	features[MapObjectType.ROUTE] = {};

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

		const iconType = obj.type === MapObjectType.NEST ? MapObjectType.POKEMON : obj.type;

		const userIconSet = iconSets[iconType];
		let overwriteIcon: string | undefined = undefined;
		let showThis: boolean = true;
		const modifiers = getModifiers(userIconSet, iconType);
		let expires = null;

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
							obj.alternative_quest_title,
							false,
							obj
						)
					)
						continue;
					showThis = true;

					const mapId = obj.mapId + "-altquest-" + obj.alternative_quest_timestamp;

					subFeatures.push(
						getIconFeature(mapId, [obj.lon, obj.lat], {
							imageUrl: getIconReward(reward.type, reward.info),
							imageSize: questModifiers.scale,
							selectedScale: selectedScale,
							imageOffset: [
								modifiers.offsetX + questModifiers.offsetX,
								modifiers.offsetY + questModifiers.offsetY
							],
							id: obj.mapId,
							expires: obj.alternative_quest_expiry ?? null
						})
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

					subFeatures.push(
						getIconFeature(mapId, [obj.lon, obj.lat], {
							imageUrl: getIconReward(reward.type, reward.info),
							imageSize: questModifiers.scale,
							selectedScale: selectedScale,
							imageOffset: [
								modifiers.offsetX + questModifiers.offsetX,
								modifiers.offsetY + questModifiers.offsetY + spacing
							],
							id: obj.mapId,
							expires: obj.quest_expiry ?? null
						})
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

				subFeatures.push(
					getIconFeature(mapId, [obj.lon, obj.lat], {
						imageUrl: getIconInvasion(incident.character, incident.confirmed),
						imageSize: invasionModifiers.scale,
						selectedScale: selectedScale,
						imageOffset: [
							modifiers.offsetX + invasionModifiers.offsetX,
							modifiers.offsetY + invasionModifiers.offsetY + index * invasionModifiers.spacing
						],
						id: obj.mapId,
						expires: incident.expiration
					})
				);
				index += 1;
			}
		} else if (obj.type === MapObjectType.GYM) {
			showThis = showAllGyms || shouldDisplayRaid(obj) || isSelected || isSelectedOverwrite;

			if ((obj.updated ?? 0) < timestamp - FORT_OUTDATED_SECONDS) {
				overwriteIcon = getIconGym({ team_id: 0 });
			} else if (shouldDisplayRaid(obj)) {
				if (obj.raid_pokemon_id) {
					const mapId = obj.mapId + "-raidpokemon-" + obj.raid_spawn_timestamp;
					let raidModifiers = getModifiers(userIconSet, "raid_pokemon");

					if (obj.availble_slots === 0 && userIconSet?.raid_egg_6) {
						raidModifiers = getModifiers(userIconSet, "raid_pokemon_6");
					}

					subFeatures.push(
						getIconFeature(mapId, [obj.lon, obj.lat], {
							imageUrl: getIconPokemon(getRaidPokemon(obj)),
							imageSize: getModifiers(userIconSet, "pokemon").scale * raidModifiers.scale,
							selectedScale: selectedScale,
							imageOffset: [
								modifiers.offsetX + raidModifiers.offsetX,
								modifiers.offsetY + raidModifiers.offsetY
							],
							id: obj.mapId,
							expires: obj.raid_end_timestamp ?? null
						})
					);
				} else {
					const mapId = obj.mapId + "-raidegg-" + obj.raid_spawn_timestamp;
					let raidModifiers = getModifiers(userIconSet, "raid_egg");

					if (obj.availble_slots === 0 && userIconSet?.raid_egg_6) {
						raidModifiers = getModifiers(userIconSet, "raid_egg_6");
					}

					subFeatures.push(
						getIconFeature(mapId, [obj.lon, obj.lat], {
							imageUrl: getIconRaidEgg(obj.raid_level ?? 0),
							imageSize: raidModifiers.scale,
							selectedScale: selectedScale,
							imageOffset: [
								modifiers.offsetX + raidModifiers.offsetX,
								modifiers.offsetY + raidModifiers.offsetY
							],
							id: obj.mapId,
							expires: obj.raid_battle_timestamp ?? null
						})
					);
				}
			}
		} else if (obj.type === MapObjectType.POKEMON) {
			if (obj.expire_timestamp && obj.expire_timestamp < timestamp) continue;
			expires = obj.expire_timestamp;
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
			showThis = false;
			const route = obj as RouteData;

			// Create one icon per fort (first route to claim it wins)
			if (!routeFortIconCreated.has(route.start_fort_id)) {
				routeFortIconCreated.add(route.start_fort_id);
				const group = routeFortGroups.get(route.start_fort_id)!;
				const count = group.routes.length;
				subFeatures.push(
					getIconFeature(obj.mapId + "-start", [route.start_lon, route.start_lat], {
						imageUrl: "/route_icon.svg",
						id: obj.mapId,
						imageSize: modifiers.scale,
						selectedScale: selectedScale,
						imageOffset: [0, 0],
						expires: null,
						fortId: route.start_fort_id,
						...(count > 1 ? { routeCount: count } : {})
					})
				);
			}

			if (route.reversible === 1 && !routeFortIconCreated.has(route.end_fort_id)) {
				routeFortIconCreated.add(route.end_fort_id);
				const group = routeFortGroups.get(route.end_fort_id)!;
				const count = group.routes.length;
				subFeatures.push(
					getIconFeature(obj.mapId + "-end", [route.end_lon, route.end_lat], {
						imageUrl: "/route_icon.svg",
						id: obj.mapId,
						imageSize: modifiers.scale,
						selectedScale: selectedScale,
						imageOffset: [0, 0],
						expires: null,
						fortId: route.end_fort_id,
						...(count > 1 ? { routeCount: count } : {})
					})
				);
			}
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
			subFeatures.push(
				getIconFeature(obj.mapId, [obj.lon, obj.lat], {
					imageUrl: overwriteIcon ?? getIconForMap(obj),
					id: obj.mapId,
					imageSize: modifiers.scale,
					selectedScale: selectedScale,
					imageOffset: [modifiers.offsetX, modifiers.offsetY],
					expires
				})
			);
		}

		features[obj.type][obj.mapId] = subFeatures;
		if (obj.mapId === selectedMapId) selectedFeatures = [...selectedFeatures, ...subFeatures];
	}
	updateMapObjectsGeoJson(getFlattenedFeatures());
}
