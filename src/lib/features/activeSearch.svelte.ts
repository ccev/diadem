import type { AnyFilter, FilterPokemon } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { mPokemon } from "@/lib/services/ingameLocale";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";

export type ActiveSearchParams = {
	filter: AnyFilter;
	mapObject: MapObjectType;
	name: string;
};

let activeSearchSvelte: ActiveSearchParams | undefined = $state(undefined);

// setActiveSearch({
// 	name: "Vulpix (Alola)",
// 	mapObject: MapObjectType.POKEMON,
// 	filter: {
// 		category: "pokemon",
// 		enabled: true,
// 		filters: [
// 			{
// 				id: "searchOverwrite",
// 				enabled: true,
// 				title: { message: "unknown_filter" },
// 				icon: { isUserSelected: false },
// 				pokemon: [
// 					{
// 						pokemon_id: 37,
// 						form: 56
// 					}
// 				]
// 			}
// 		]
// 	} as FilterPokemon
// });

export function getActiveSearch() {
	return activeSearchSvelte;
}

export function isSearchViewActive() {
	return Boolean(activeSearchSvelte);
}

export function setActiveSearch(newParams: ActiveSearchParams) {
	activeSearchSvelte = newParams;
	updateAllMapObjects().then()
}

export function resetActiveSearchFilter() {
	activeSearchSvelte = undefined;
	updateAllMapObjects().then()
}

export function setActiveSearchPokemon(pokemon: { pokemon_id: number; form?: number }) {
	setActiveSearch({
		name: mPokemon(pokemon),
		mapObject: MapObjectType.POKEMON,
		filter: {
			category: "pokemon",
			enabled: true,
			filters: [
				{
					id: "searchOverwrite",
					enabled: true,
					title: { message: "unknown_filter" },
					icon: { isUserSelected: false },
					pokemon: [
						{
							pokemon_id: pokemon.pokemon_id,
							form: pokemon.form
						}
					]
				}
			]
		} as FilterPokemon
	});
}
