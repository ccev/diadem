import { UICONS } from "uicons.js"
import {getUserSettings} from '@/lib/userSettings.svelte';
import {getConfig, type UiconSet} from '@/lib/config';
import type {PokemonData} from '@/lib/types/mapObjectData/pokemon';

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

export function getCurrentUiconSetDetails(): UiconSet | undefined {
	return getUiconSetDetails(getUserSettings().uiconSet.id)
}

export function getUicon() {
	return iconSets[getUserSettings().uiconSet.id]
}

export function getIconPokemon(data: Partial<PokemonData>, iconSet: string = getUserSettings().uiconSet.id) {
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

export function getIconPokestop(data: Partial<PokemonData>, iconSet: string = getUserSettings().uiconSet.id) {
	return iconSets[iconSet].pokestop()
}
