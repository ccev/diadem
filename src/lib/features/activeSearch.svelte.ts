import type { AnyFilter, FilterPokemon, FilterPokestop } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { mItem, mPokemon } from "@/lib/services/ingameLocale";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
import { getDefaultPokestopFilter, RewardType, rewardTypeLabel } from "@/lib/utils/pokestopUtils";
import type { QuestReward } from "@/lib/types/mapObjectData/pokestop";
import type { FiltersetQuest } from "@/lib/features/filters/filtersets";
import * as m from "@/lib/paraglide/messages";

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
	updateAllMapObjects().then();
}

export function resetActiveSearchFilter() {
	activeSearchSvelte = undefined;
	updateAllMapObjects().then();
}

export function setActiveSearchPokemon(
	name: string,
	pokemon: { pokemon_id: number; form?: number }
) {
	setActiveSearch({
		name,
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

export function setActiveSearchQuest(name: string, reward: QuestReward) {
	const filterset = {
		id: "searchOverwrite",
		enabled: true,
		title: { message: "unknown_filter" },
		icon: { isUserSelected: false },
		rewardType: reward.type
	} as FiltersetQuest;

	switch (reward.type) {
		case RewardType.ITEM:
			filterset.item = [{ id: reward.info.item_id.toString() }]
			break
		case RewardType.CANDY:
			filterset.candy = [{ id: reward.info.pokemon_id.toString() }]
			break
		case RewardType.POKEMON:
			filterset.pokemon = [{ pokemon_id: reward.info.pokemon_id, form: reward.info.form }]
			break
		case RewardType.XL_CANDY:
			filterset.xlCandy = [{ id: reward.info.pokemon_id.toString() }]
			break
		case RewardType.MEGA_ENERGY:
			filterset.megaResource = [{ id: reward.info.pokemon_id.toString() }]
			break
	}

	const filter = getDefaultPokestopFilter();
	filter.quest.enabled = true;
	filter.quest.filters = [filterset];

	setActiveSearch({
		name,
		mapObject: MapObjectType.POKESTOP,
		filter: filter
	});
}
