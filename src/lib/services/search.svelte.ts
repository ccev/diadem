import type { Coords } from "@/lib/utils/coordinates";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { mPokemon, type PokemonSearchEntry, prefixes } from "@/lib/services/ingameLocale";
import createFuzzySearch, { type FuzzyMatches, type FuzzySearcher } from "@nozbe/microfuzz";
import { getKojiGeofences, type KojiFeature } from "@/lib/features/koji";
import type { Attachment } from "svelte/attachments";
import { browser } from "$app/environment";
import { getSpawnablePokemon } from "@/lib/services/masterfile";

const searchLimit = 20;
const highlightKey = "search-highlight";
const areaIcon = "Globe";

export enum SearchableType {
	POKEMON = "pokemon",
	AREA = "area",
	ADDRESS = "address",
	GYM = "gym",
	POKESTOP = "pokestop",
	STATION = "station"
}

export type SearchEntry = {
	name: string;
	key: string;
	icon?: string;
	imageUrl?: string;
	type: SearchableType;
};

export type AreaSearchEntry = SearchEntry & {
	icon: string;
	feature: KojiFeature;
	type: SearchableType.AREA;
};

export type PokemonSearchEntry = SearchEntry & {
	id: number;
	form: number;
	type: SearchableType.POKEMON;
};

export type AnySearchEntry = PokemonSearchEntry | AreaSearchEntry;

let currentSearchQuery = $state("")

let fuzzy: FuzzySearcher<AnySearchEntry>;

let highlight: Highlight;
if (browser) {
	highlight = new Highlight();
	CSS.highlights.set(highlightKey, highlight);
}

export function getCurrentSearchQuery() {
	return currentSearchQuery
}

export function setCurrentSearchQuery(query: string) {
	currentSearchQuery = query
}

export function initSearch() {
	const pokemonEntries = getSpawnablePokemon().map((p) => {
		return {
			name: mPokemon(p),
			id: p.pokemon_id,
			form: p.form,
			key: "pokemon-" + p.pokemon_id + "-" + p.form,
			type: SearchableType.POKEMON
		} as PokemonSearchEntry;
	});

	const areaEntries = getKojiGeofences().map((k) => {
		return {
			name: k.properties.name,
			key: "area-" + k.properties.name,
			type: SearchableType.AREA,
			icon: k.properties.lucideIcon ?? areaIcon,
			feature: k
		} as AreaSearchEntry;
	});

	// order matters. sorted by priority
	const allSearchResults = [...areaEntries, ...pokemonEntries];
	fuzzy = createFuzzySearch(allSearchResults, { key: "name" });
}

export function search(query: string, limit: boolean) {
	const results = fuzzy(query);
	if (limit) return results.slice(0, searchLimit);
	return results;
}

export function highlightSearchMatches(matches: FuzzyMatches): Attachment {
	return (element) => {
		// only highlight first part of keys array
		const match = matches[0];
		if (!match) return;

		const text = element.childNodes[0];
		const ranges: Range[] = [];

		for (const indexes of match) {
			const range = new Range();
			range.setStart(text, indexes[0]);
			range.setEnd(text, indexes[1] + 1);
			highlight.add(range);
			ranges.push(range);
		}

		return () => ranges.forEach((r) => highlight.delete(r));
	};
}

let allPokemonNames: PokemonSearchEntry[] | undefined = undefined;

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
	name: string;
	range: number;
	center: {
		lat: number;
		lon: number;
	};
};

export enum SearchType {
	GYM = "gym",
	POKESTOP = "pokestop",
	POKEMON = "pokemon"
}

export async function searchExternal<T>(
	type: SearchType,
	name: string,
	center: Coords
): Promise<undefined | T[]> {
	const payload: SearchPayload = {
		name,
		range: getUserSettings().searchRange,
		center: center.internal()
	};

	const result = await fetch("/api/search/" + type, {
		method: "POST",
		body: JSON.stringify(payload)
	});
	if (!result.ok) {
		console.error("Search failed!");
		return;
	}

	return await result.json();
}

export function searchPokemon(query: string) {
	if (allPokemonNames === undefined) {
	}

	return sortSearchResults(allPokemonNames, query, (p) => p.name);
}
