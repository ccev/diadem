import { UICONS } from "uicons.js"
import {getUserSettings} from '@/lib/userSettings.svelte';
import {getConfig} from '@/lib/config/config';
import type {PokemonData} from '@/lib/types/mapObjectData/pokemon';
import type { UiconSet } from '@/lib/config/config.d';
import type { MapData, MapObjectType } from '@/lib/types/mapObjectData/mapObjects';
import type { Incident, PokestopData, QuestReward } from '@/lib/types/mapObjectData/pokestop';
import type { StationData } from '@/lib/types/mapObjectData/station';
import type { GymData } from '@/lib/types/mapObjectData/gym';
import { currentTimestamp } from '@/lib/utils.svelte';
import { GYM_SLOTS, hasFortActiveLure, isFortOutdated } from '@/lib/pogoUtils';
import { allMapTypes } from '@/lib/mapObjects/mapObjectsState.svelte.js';

export const DEFAULT_UICONS = "_internal_default"
const DEFAULT_URL = "https://raw.githubusercontent.com/WatWowMap/wwm-uicons/main/"

const iconSets: {[key: string]: UICONS} = {}

export async function initIconSet(id: string, url: string) {
	if (id in iconSets) return
	const newSet = new UICONS(url)
	iconSets[id] = newSet
	await newSet.remoteInit()
}

export async function initAllIconSets() {
	await Promise.all(
		[
			...getConfig().uiconSets.map(s => initIconSet(s.id, s.url)),
			initIconSet(DEFAULT_UICONS, DEFAULT_URL)
		]
	)
}

export function getUiconSetDetails(id: string): UiconSet | undefined {
	return getConfig().uiconSets.find(s => s.id === id)
}

export function getCurrentUiconSetDetails(type: MapObjectType): UiconSet | undefined {
	return getUiconSetDetails(getUserSettings().uiconSet[type].id)
}

export function getCurrentUiconSetDetailsAllTypes(): {[key in MapObjectType]: UiconSet | undefined} {
	return allMapTypes.reduce((obj, type) => {
		obj[type] = getCurrentUiconSetDetails(type)
		return obj
	}, {})
}

export function getIconForMap(data: Partial<MapData>): string {
	if (data.type === "pokemon") {
		return getIconPokemon(data)
	} else if (data.type === "pokestop") {
		return getIconPokestop(data)
	} else if (data.type === "gym") {
		return getIconGym(data)
	} else if (data.type === "station") {
		return getIconStation(data)
	}
	console.error("Unknown icon type: " + data.type)
	return ""
}

export function getIconPokemon(data: Partial<PokemonData>, iconSet: string = getUserSettings().uiconSet.pokemon.id) {
	return iconSets[iconSet].pokemon(
		data.pokemon_id,
		data.temp_evolution_id,
		data.form,
		data.costume,
		data.gender,
		data.alignment,
		data.bread_mode,
		false
	)
}

export function getIconPokestop(data: Partial<PokestopData>, iconSet: string = getUserSettings().uiconSet.pokestop.id) {
	// maybe this is not the right location for these modifations. can be moved later
	let lureId = 0
	if (hasFortActiveLure(data)) {
		lureId = data.lure_id ?? 0
	}

	let displayType: boolean | number = false
	for (const incident of data.incident ?? []) {
		if (incident.display_type && incident.expiration > currentTimestamp()) {
			displayType = incident.display_type
			break
		}
	}

	const powerUp = isFortOutdated(data.updated) ? 0 : data.power_up_level

	return iconSets[iconSet].pokestop(
		lureId,
		displayType,
		false,  // quest active
		Boolean(data.ar_scan_eligible),
		powerUp
	)
}

export function getIconGym(data: Partial<GymData>, iconSet: string = getUserSettings().uiconSet.gym.id) {
	// maybe this is not the right location for these modifations. can be moved later
	const powerUp = isFortOutdated(data.updated) ? 0 : data.power_up_level
	let availableSlots = data.availble_slots ? GYM_SLOTS - data.availble_slots : GYM_SLOTS
	if (isFortOutdated(data.updated)) availableSlots = GYM_SLOTS

	return iconSets[iconSet].gym(
		data.team_id,
		availableSlots,
		Boolean(data.in_battle),
		Boolean(data.ex_raid_eligible),
		Boolean(data.ar_scan_eligible),
		powerUp
	)
}

export function getIconStation(data: Partial<StationData>, iconSet: string = getUserSettings().uiconSet.station.id) {
	return iconSets[iconSet].station(data.start_time < currentTimestamp())
}

export function getIconInvasion(data: Incident) {
	return iconSets[DEFAULT_UICONS].invasion(data.character, Boolean(data.confirmed))
}

export function getIconReward(data: QuestReward) {
	let rewardType = ""
	let id = 0
	switch (data.type) {
		case 1:
			rewardType = "experience"
			break
		case 2:
			rewardType = "item"
			id = data.info.item_id
			break
		case 3:
			rewardType = "stardust"
			break
		case 4:
			rewardType = "candy"
			id = data.info.pokemon_id
			break
		case 5:
			rewardType = "avatar_clothing"
			break
		case 6:
			rewardType = "quest"
			break
		case 7:
			return getIconPokemon(data.info)
		case 8:
			rewardType = "pokecoin"
			break
		case 9:
			rewardType = "xl_candy"
			id = data.info.pokemon_id
			break
		case 10:
			rewardType = "level_cap"
			break
		case 11:
			rewardType = "sticker"
			break
		case 12:
			rewardType = "mega_resource"
			id = data.info.pokemon_id
			break
		case 13:
			rewardType = "incident"
			break
		case 14:
			rewardType = "player_attribute"
			break
		default:
			rewardType = ""
	}

	return iconSets[DEFAULT_UICONS].reward(rewardType, id, data.info?.amount ?? 0)
}

export function getIconItem(itemId: number, amount: number = 0) {
	return iconSets[DEFAULT_UICONS].reward("item", itemId, amount)
}

export function getIconRaidEgg(level: number) {
	return iconSets[DEFAULT_UICONS].raidEgg(level)
}

export function getIconType(type: number) {
	return iconSets[DEFAULT_UICONS].type(type)
}

export function getIconContest() {
	return iconSets[DEFAULT_UICONS].misc("showcase")
}