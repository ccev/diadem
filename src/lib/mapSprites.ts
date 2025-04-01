import type { Feature } from 'geojson';
import { getCurrentUiconSetDetails, getIconForMap, getIconInvasion, getIconReward } from '@/lib/uicons.svelte';
import { getMapObjects, type MapObjectsStateType } from '@/lib/mapObjects/mapObjects.svelte';
import { currentTimestamp } from '@/lib/utils.svelte';

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

export function getMapFeatures(mapObjects: MapObjectsStateType): Feature[] {
	const features: Feature[] = []

	for (const obj of Object.values(mapObjects)) {
		const userIconSet = getCurrentUiconSetDetails(obj.type)
		let scale: number = 0.25
		let offsetY: number = 0
		let offsetX: number = 0

		if (userIconSet) {
			const modifier = userIconSet[obj.type]
			const baseModifier = userIconSet.base
			if (modifier && typeof modifier === "object") {
				scale = modifier?.scale ?? baseModifier?.scale ?? scale
				offsetY = modifier?.offsetY ?? baseModifier?.offsetY ?? offsetY
				offsetX = modifier?.offsetX ?? baseModifier?.offsetX ?? offsetX
			}
		}

		if (obj.type === "pokestop") {
			// TODO: only show if enabled in filters

			const questSize = 0.13
			const questOffsetX = -50
			if (obj.alternative_quest_target && obj.alternative_quest_rewards) {
				const reward = JSON.parse(obj.alternative_quest_rewards)[0]
				features.push(getFeature(
					obj.mapId + "-altquest-" + obj.alternative_quest_rewards,
					[obj.lon, obj.lat],
					{
						imageUrl: getIconReward(reward),
						imageSize: questSize,
						imageOffset: [questOffsetX, 35],
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
						imageSize: questSize,
						imageOffset: [questOffsetX, -85],
						id: obj.mapId
					}
				))
			}

			for (const [index, incident] of obj.incident.entries()) {
				if (
					!incident.id
					|| ![1, 2, 3].includes(incident.display_type)
					|| incident.expiration < currentTimestamp()
					) {
					continue
				}
				features.push(getFeature(
					obj.mapId + "-incident-" + incident.id,
					[obj.lon, obj.lat],
					{
						imageUrl: getIconInvasion(incident),
						imageSize: 0.11,
						imageOffset: [70, -85 + (index * 130)],
						id: obj.mapId
					}
				))
			}
		}

		features.push(getFeature(obj.mapId, [obj.lon, obj.lat], {
			imageUrl: getIconForMap(obj),
			id: obj.mapId,
			imageSize: scale,
			// imageOffset: [offsetX, offsetY]
		}))


	}

	return features
}