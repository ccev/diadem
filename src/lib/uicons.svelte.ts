import { UICONS } from "uicons.js"
import {getUserSettings} from '@/lib/userSettings.svelte';
import {getConfig} from '@/lib/config';
import type {PokemonData} from '@/lib/types/mapObjectData/pokemon';
import type { UiconSet } from '@/lib/types/config';
import type { MapData, MapObjectType } from '@/lib/types/mapObjectData/mapObjects';
import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';
import type { StationData } from '@/lib/types/mapObjectData/station';
import type { GymData } from '@/lib/types/mapObjectData/gym';

const iconSets: {[key: string]: UICONS} = {}

export async function initIconSet(id: string, url: string) {
	if (id in iconSets) return
	const newSet = new UICONS(url)
	iconSets[id] = newSet
	await newSet.remoteInit()
}

export async function initAllIconSets() {
	await Promise.all(getConfig().uiconSets.map((s) => initIconSet(s.id, s.url)))
}

export function getUiconSetDetails(id: string): UiconSet | undefined {
	return getConfig().uiconSets.find(s => s.id === id)
}

export function getCurrentUiconSetDetails(type: MapObjectType): UiconSet | undefined {
	return getUiconSetDetails(getUserSettings().uiconSet[type].id)
}

export function getIcon(data: Partial<MapData>): string {
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
	let lureId = 0
	if (data.lure_id && data.lure_expire_timestamp && data.lure_expire_timestamp > Date.now() / 1000) {
		lureId = data.lure_id
	}

	let displayType: boolean | number = false
	for (const incident of data.incident ?? []) {
		if (incident.display_type) {
			displayType = incident.display_type
			break
		}
	}

	return iconSets[iconSet].pokestop(
		lureId,
		displayType,
		false,  // quest active
		Boolean(data.ar_scan_eligible),
		data.power_up_level
	)
}

export function getIconGym(data: Partial<GymData>, iconSet: string = getUserSettings().uiconSet.gym.id) {
	return iconSets[iconSet].gym(
		data.team_id,
		data.available_slots ? 6 - data.available_slots : 0,
		Boolean(data.in_battle),
		Boolean(data.ex_raid_eligible),
		Boolean(data.ar_scan_eligible),
		data.power_up_level
	)
}

export function getIconStation(data: Partial<StationData>, iconSet: string = getUserSettings().uiconSet.station.id) {
	return iconSets[iconSet].station(!data.is_inactive)
}