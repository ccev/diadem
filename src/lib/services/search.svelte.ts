import type { Coords } from "@/lib/utils/coordinates";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import  { getAllPokemonNames, type PokemonLocaleName } from "@/lib/services/ingameLocale";

let allPokemonNames: PokemonLocaleName[] | undefined = undefined

/**
 * Sorts given array by .startswith(), then .includes()
 */
export function sortSearchResults<T>(items: T[], query: string, selector: (item: T) => string) {
	const q = query.toLowerCase();

	return items
		.filter((item) => selector(item).toLowerCase().includes(q))
		.sort((a, b) => {
			const nameA = selector(a).toLowerCase();
			const nameB = selector(b).toLowerCase();

			const startsWithA = nameA.startsWith(q);
			const startsWithB = nameB.startsWith(q);

			if (startsWithA && !startsWithB) return -1;
			if (!startsWithA && startsWithB) return 1;

			return nameA.localeCompare(nameB);
		});
}

export type SearchPayload = {
	name: string
	range: number
	center: {
		lat: number
		lon: number
	}
}

export enum SearchType {
	GYM = "gym",
	POKESTOP = "pokestop",
	POKEMON = "pokemon"
}

export async function searchExternal<T>(type: SearchType, name: string, center: Coords): Promise<undefined | T[]> {
	const payload: SearchPayload = { name, range: getUserSettings().searchRange, center: center.internal() }

	const result = await fetch("/api/search/" + type, { method: "POST", body: JSON.stringify(payload) })
	if (!result.ok) {
		console.error("Search failed!")
		return
	}

	return await result.json()
}

export function searchPokemon(query: string) {
	if (allPokemonNames === undefined) {
		allPokemonNames = getAllPokemonNames()
	}

	return sortSearchResults(allPokemonNames, query, p => p.name)
}
