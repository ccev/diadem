import { getUserSettings } from '@/lib/services/userSettings.svelte.js';
import { getLocale } from "@/lib/paraglide/runtime";

export type AddressData = {
	name: string
	center: number[]
	id: number
}

export async function geocode(query: string) {
	const lang = getLocale()

	const result = await fetch("/api/address/" + encodeURIComponent(query) + "?lang=" + lang)

	if (!result.ok) {
		console.error("Address request failed!")
		return []
	}

	const data: AddressData[] = await result.json()
	return data
}