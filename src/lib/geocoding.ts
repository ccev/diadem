import { getUserSettings } from '@/lib/userSettings.svelte';

export type AddressData = {
	name: string
	center: number[]
	id: number
}

export async function geocode(query: string) {
	const lang = getUserSettings().languageTag

	const result = await fetch("/api/address/" + encodeURIComponent(query) + "?lang=" + lang)
	const data: { error: null | string, result: AddressData[] } = await result.json()
	return data.result
}