import { getUserSettings } from '@/lib/services/userSettings.svelte.js';

export type AddressData = {
	name: string
	center: number[]
	id: number
}

export async function geocode(query: string) {
	const lang = getUserSettings().languageTag

	const result = await fetch("/api/address/" + encodeURIComponent(query) + "?lang=" + lang)

	if (!result.ok) {
		console.error("Address request failed!")
		return []
	}

	const data: { error: null | string, result: AddressData[] } = await result.json()
	return data.result
}