import type { Feature } from 'geojson';
import {
	getCurrentUiconSetDetails,
	getIconForMap,
	getIconGym,
	getIconInvasion, getIconPokemon, getIconRaidEgg,
	getIconReward
} from '@/lib/uicons.svelte';
import { getMapObjects, type MapObjectsStateType } from '@/lib/mapObjects/mapObjects.svelte';
import { currentTimestamp } from '@/lib/utils.svelte';
import { getUserSettings } from '@/lib/userSettings.svelte';
import { GYM_OUTDATED_SECONDS } from '@/lib/constants';
import { getRaidPokemon, isFortOutdated, isIncidentInvasion } from '@/lib/pogoUtils';
import type { UiconSet } from '@/lib/types/config';
import type { MapData, MapObjectType } from '@/lib/types/mapObjectData/mapObjects';

type IconProperties = {
	imageUrl: string
	imageSize: number
	imageOffset?: number[]
	id?: string
}

function getFeature(id: string, coordinates: number[], properties: IconProperties): Feature {
	return {
		type: "Feature",
		geometry: {
			type: "Point",
			coordinates: coordinates
		},
		properties,
		id
	}
}

function getModifiers(iconSet: UiconSet | undefined, type: MapObjectType) {
	let scale: number = 0.25
	let offsetY: number = 0
	let offsetX: number = 0

	if (iconSet) {
		const modifier = iconSet[type]
		const baseModifier = iconSet.base
		if (modifier && typeof modifier === "object") {
			scale = modifier?.scale ?? baseModifier?.scale ?? scale
			offsetY = modifier?.offsetY ?? baseModifier?.offsetY ?? offsetY
			offsetX = modifier?.offsetX ?? baseModifier?.offsetX ?? offsetX
		}
	}

	return { scale, offsetY, offsetX }
}

export function getMapFeatures(mapObjects: MapObjectsStateType, currentSelected: MapData | null): Feature[] {
	const features: Feature[] = []

	for (const obj of Object.values(mapObjects)) {
		const userIconSet = getCurrentUiconSetDetails(obj.type)
		let overwriteIcon: string | undefined = undefined
		const modifiers = getModifiers(userIconSet, obj.type)
		let selectedScale = 1

		if (obj.mapId === currentSelected?.mapId) selectedScale = 2

		if (obj.type === "pokestop") {
			if (getUserSettings().filters.quest.type !== "none") {
				const questSize = 0.13
				const questOffsetX = -50
				if (obj.alternative_quest_target && obj.alternative_quest_rewards) {
					const reward = JSON.parse(obj.alternative_quest_rewards)[0]
					features.push(getFeature(
						obj.mapId + "-altquest-" + obj.alternative_quest_rewards,
						[obj.lon, obj.lat],
						{
							imageUrl: getIconReward(reward),
							imageSize: questSize * selectedScale,
							imageOffset: [questOffsetX, modifiers.offsetY + 35],
							id: obj.mapId
						}
					))
				}
				if (obj.quest_target && obj.quest_rewards) {
					const reward = JSON.parse(obj.quest_rewards)[0]
					features.push(getFeature(
						obj.mapId + "-quest-" + obj.quest_rewards,
						[obj.lon, obj.lat],
						{
							imageUrl: getIconReward(reward),
							imageSize: questSize * selectedScale,
							imageOffset: [questOffsetX, modifiers.offsetY + -85],
							id: obj.mapId
						}
					))
				}
			}

			let index = 0
			if (getUserSettings().filters.invasion.type !== "none") {
				for (const incident of obj.incident) {
					if (
						!incident.id
						|| !isIncidentInvasion(incident)
						|| incident.expiration < currentTimestamp()
					) {
						continue
					}
					features.push(getFeature(
						obj.mapId + "-incident-" + incident.id,
						[obj.lon, obj.lat],
						{
							imageUrl: getIconInvasion(incident),
							imageSize: 0.11 * selectedScale,
							imageOffset: [70, modifiers.offsetY + -85 + (index * 130)],
							id: obj.mapId
						}
					))
					index += 1
				}
			}
		} else if (obj.type === "gym") {
			// TODO: minor optimizatin: move as much out of the loop as possible
			if (isFortOutdated(obj.updated)) {
				overwriteIcon = getIconGym({ team_id: 0 })
			}
			if ((obj.raid_end_timestamp ?? 0) > currentTimestamp()) {
				if (obj.raid_pokemon_id) {
					features.push(getFeature(
						obj.mapId + "-raidpokemon-" + obj.raid_pokemon_id,
						[obj.lon, obj.lat],
						{
							imageUrl: getIconPokemon(getRaidPokemon(obj)),
							imageSize: getModifiers(userIconSet, "pokemon").scale * 0.8 * selectedScale,
							imageOffset: [-30, modifiers.offsetY - 30],
							id: obj.mapId
						}
					))
				} else {
					features.push(getFeature(
						obj.mapId + "-raidegg-" + obj.raid_level,
						[obj.lon, obj.lat],
						{
							imageUrl: getIconRaidEgg(obj.raid_level ?? 0),
							imageSize: 0.12 * selectedScale,
							imageOffset: [-60, modifiers.offsetY - 80],
							id: obj.mapId
						}
					))
				}
			}
		}

		features.push(getFeature(obj.mapId, [obj.lon, obj.lat], {
			imageUrl: overwriteIcon ?? getIconForMap(obj),
			id: obj.mapId,
			imageSize: modifiers.scale * selectedScale,
			imageOffset: [modifiers.offsetX, modifiers.offsetY]
		}))

		// features.push(getFeature("debug-red-dot", [obj.lon, obj.lat], {
		// 	imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Red_Circle%28small%29.svg/29px-Red_Circle%28small%29.svg.png",
		// 	id: obj.mapId,
		// 	imageSize: 0.1
		// }))
	}

	return features
}