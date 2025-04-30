import type { Feature as GeojsonFeature, Point } from 'geojson';
import {
	getCurrentUiconSetDetails,
	getCurrentUiconSetDetailsAllTypes,
	getIconForMap,
	getIconGym,
	getIconInvasion,
	getIconPokemon,
	getIconRaidEgg,
	getIconReward
} from '@/lib/uicons.svelte.js';
import {
	getMapObjects,
	type MapObjectsStateType
} from '@/lib/mapObjects/mapObjectsState.svelte.js';
import { currentTimestamp } from '@/lib/utils.svelte.js';
import { getUserSettings } from '@/lib/userSettings.svelte.js';
import { GYM_OUTDATED_SECONDS, SELECTED_MAP_OBJECT_SCALE } from '@/lib/constants';
import { getRaidPokemon, getStationPokemon, isFortOutdated, isIncidentInvasion } from '@/lib/pogoUtils';
import type { UiconSet, UiconSetModifierType } from '@/lib/types/config';
import type { MapData, MapObjectType } from '@/lib/types/mapObjectData/mapObjects';
import type { Coordinates } from 'maplibre-gl';
import { untrack } from 'svelte';
import { getCurrentSelectedMapId } from '@/lib/mapObjects/currentSelectedState.svelte.js';
import { updateMapObjectsGeoJson } from '@/lib/map/featuresManage.svelte';

export type IconProperties = {
	imageUrl: string;
	imageSize: number;
	imageSelectedScale: number;
	imageOffset?: number[];
	id: string;
	expires: number | null
};

export type Feature = GeojsonFeature<Point, IconProperties>;

let features: {
	[key in MapObjectType]: {
		[key: string]: Feature[];
	};
} = {
	pokemon: {},
	gym: {},
	pokestop: {},
	station: {}
};

let selectedFeatures: Feature[] = [];

function getFlattenedFeatures(): Feature[] {
	return Object.values(features)
		.map((f) => Object.values(f))
		.flat(2);
}

function getFeature(id: string, coordinates: number[], properties: IconProperties): Feature {
	return {
		type: 'Feature',
		geometry: {
			type: 'Point',
			coordinates: coordinates
		},
		properties,
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
		if (modifier && typeof modifier === 'object') {
			scale = modifier?.scale ?? baseModifier?.scale ?? scale;
			offsetY = modifier?.offsetY ?? baseModifier?.offsetY ?? offsetY;
			offsetX = modifier?.offsetX ?? baseModifier?.offsetX ?? offsetX;
			spacing = modifier?.spacing ?? baseModifier?.spacing ?? spacing;
		}
	}

	return { scale, offsetY, offsetX, spacing };
}

export function deleteAllFeaturesOfType(type: MapObjectType) {
	features[type] = {}
}

export function updateSelected(currentSelected: MapData | null) {
	// TODO base the scale on original modifiers, not the current size
	if (selectedFeatures) {
		selectedFeatures.forEach((f) => (f.properties.imageSelectedScale = 1));
		selectedFeatures = [];
	}

	if (currentSelected) {
		const thisFeatures = features[currentSelected.type][currentSelected.mapId] ?? [];
		thisFeatures.forEach((f) => (f.properties.imageSelectedScale = SELECTED_MAP_OBJECT_SCALE));
		selectedFeatures = thisFeatures;
	}

	updateMapObjectsGeoJson(getFlattenedFeatures())
}

export function updateFeatures(mapObjects: MapObjectsStateType) {
	console.log("running updateFeatures")

	// TODO perf: only update if needed by storing a id: hash table
	// TODO perf: when currentSelected is updated, only update what's needed and not the whole array

	const startTime = performance.now();

	const showQuests = getUserSettings().filters.quest.type !== 'none';
	const showInvasions = getUserSettings().filters.invasion.type !== 'none';

	const iconSets = getCurrentUiconSetDetailsAllTypes();
	const timestamp = currentTimestamp();

	const selectedMapId = getCurrentSelectedMapId()

	const allCurrentMapIds = Object.keys(mapObjects);
	// const allFeatureMapIds = flattenFeatures().map(f => f.properties.id)

	for (const [type, thisFeatures] of Object.entries(features)) {
		for (const [existingId, subFeatures] of Object.entries(thisFeatures)) {
			if (
				subFeatures.find(f => f.properties.expires !== null && f.properties.expires < timestamp)
				|| !allCurrentMapIds.includes(existingId)
			) {
				delete features[type][existingId];
			}
		}
	}

	const loopTime = performance.now();
	console.debug('feature: init took ' + (loopTime - startTime) + 'ms');

	for (const obj of Object.values(mapObjects)) {
		if (features[obj.type][obj.mapId]) continue

		const userIconSet = iconSets[obj.type];
		let overwriteIcon: string | undefined = undefined;
		const modifiers = getModifiers(userIconSet, obj.type);
		let selectedScale = 1;
		let expires = null

		const subFeatures: Feature[] = [];

		if (obj.mapId === selectedMapId) selectedScale = SELECTED_MAP_OBJECT_SCALE;

		if (obj.type === 'pokestop') {
			if (showQuests) {
				const questModifiers = getModifiers(userIconSet, "quest")
				if (obj.alternative_quest_target && obj.alternative_quest_rewards) {
					const reward = JSON.parse(obj.alternative_quest_rewards)[0];
					const mapId = obj.mapId + '-altquest-' + obj.alternative_quest_timestamp;

					subFeatures.push(
						getFeature(mapId, [obj.lon, obj.lat], {
							imageUrl: getIconReward(reward),
							imageSize: questModifiers.scale,
							imageSelectedScale: selectedScale,
							imageOffset: [modifiers.offsetX + questModifiers.offsetX, modifiers.offsetY + questModifiers.offsetY],
							id: obj.mapId,
							expires: obj.alternative_quest_expiry ?? null
						})
					);
				}
				if (obj.quest_target && obj.quest_rewards) {
					const reward = JSON.parse(obj.quest_rewards)[0];
					const mapId = obj.mapId + '-quest-' + obj.quest_timestamp;

					subFeatures.push(
						getFeature(mapId, [obj.lon, obj.lat], {
							imageUrl: getIconReward(reward),
							imageSize: questModifiers.scale,
							imageSelectedScale: selectedScale,
							imageOffset: [modifiers.offsetX + questModifiers.offsetX, modifiers.offsetY + questModifiers.offsetY + questModifiers.spacing],
							id: obj.mapId,
							expires: obj.quest_expiry ?? null
						})
					);
				}
			}

			let index = 0;
			if (showInvasions) {
				for (const incident of obj.incident) {
					if (!incident.id || !isIncidentInvasion(incident) || incident.expiration < timestamp) {
						continue;
					}

					const mapId = obj.mapId + '-incident-' + incident.id;
					const invasionModifiers = getModifiers(userIconSet, "invasion")

					subFeatures.push(
						getFeature(mapId, [obj.lon, obj.lat], {
							imageUrl: getIconInvasion(incident),
							imageSize: invasionModifiers.scale,
							imageSelectedScale: selectedScale,
							imageOffset: [modifiers.offsetX + invasionModifiers.offsetX, modifiers.offsetY + invasionModifiers.offsetY + index * invasionModifiers.spacing],
							id: obj.mapId,
							expires: incident.expiration
						})
					);
					index += 1;
				}
			}
		} else if (obj.type === 'gym') {
			if ((obj.updated ?? 0) < timestamp - GYM_OUTDATED_SECONDS) {
				overwriteIcon = getIconGym({ team_id: 0 });
			} else {
				if ((obj.raid_end_timestamp ?? 0) > timestamp) {
					if (obj.raid_pokemon_id) {
						const mapId = obj.mapId + '-raidpokemon-' + obj.raid_spawn_timestamp;
						let raidModifiers = getModifiers(userIconSet, "raid_pokemon")

						if (obj.availble_slots === 0 && userIconSet?.raid_egg_6) {
							raidModifiers = getModifiers(userIconSet, "raid_pokemon_6")
						}

						subFeatures.push(
							getFeature(mapId, [obj.lon, obj.lat], {
								imageUrl: getIconPokemon(getRaidPokemon(obj)),
								imageSize: getModifiers(userIconSet, 'pokemon').scale * raidModifiers.scale,
								imageSelectedScale: selectedScale,
								imageOffset: [modifiers.offsetX + raidModifiers.offsetX, modifiers.offsetY + raidModifiers.offsetY],
								id: obj.mapId,
								expires: obj.raid_end_timestamp ?? null
							})
						);
					} else {
						const mapId = obj.mapId + '-raidegg-' + obj.raid_spawn_timestamp;
						let raidModifiers = getModifiers(userIconSet, "raid_egg")

						if (obj.availble_slots === 0 && userIconSet?.raid_egg_6) {
							raidModifiers = getModifiers(userIconSet, "raid_egg_6")
						}

						subFeatures.push(
							getFeature(mapId, [obj.lon, obj.lat], {
								imageUrl: getIconRaidEgg(obj.raid_level ?? 0),
								imageSize: raidModifiers.scale,
								imageSelectedScale: selectedScale,
								imageOffset: [modifiers.offsetX + raidModifiers.offsetX, modifiers.offsetY + raidModifiers.offsetY],
								id: obj.mapId,
								expires: obj.raid_battle_timestamp ?? null
							})
						);
					}
				}
			}
		} else if (obj.type === "pokemon") {
			if (obj.expire_timestamp && obj.expire_timestamp < currentTimestamp()) continue
			expires = obj.expire_timestamp
		} else if (obj.type === "station") {
			expires = obj.end_time
			if (obj.battle_pokemon_id) {
				const mapId = obj.mapId + '-battle-' + obj.battle_pokemon_id;

				subFeatures.push(
					getFeature(mapId, [obj.lon, obj.lat], {
						imageUrl: getIconPokemon(getStationPokemon(obj)),
						imageSize: getModifiers(userIconSet, 'pokemon').scale * 0.8,
						imageSelectedScale: selectedScale,
						imageOffset: [0, modifiers.offsetY - 15],
						id: obj.mapId,
						expires: obj.end_time ?? null
					})
				);
			}
		}

		// subFeatures.push(getFeature("debug-red-dot", [obj.lon, obj.lat], {
		// 	imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Red_Circle%28small%29.svg/29px-Red_Circle%28small%29.svg.png",
		// 	id: obj.mapId,
		// 	imageSize: 0.05,
		// 	expires: null,
		// 	imageSelectedScale: 1
		// }))

		subFeatures.push(
			getFeature(obj.mapId, [obj.lon, obj.lat], {
				imageUrl: overwriteIcon ?? getIconForMap(obj),
				id: obj.mapId,
				imageSize: modifiers.scale,
				imageSelectedScale: selectedScale,
				imageOffset: [modifiers.offsetX, modifiers.offsetY],
				expires
			})
		);

		features[obj.type][obj.mapId] = subFeatures;
		if (obj.mapId === selectedMapId) selectedFeatures = [...selectedFeatures, ...subFeatures]
	}

	console.debug('feature: loop took ' + (performance.now() - loopTime) + 'ms');

	console.debug(
		'generating features took ' +
			(performance.now() - startTime) +
			'ms | count: ' +
			Object.values(mapObjects).length
	);
	updateMapObjectsGeoJson(getFlattenedFeatures())
}
