import { getIconItem, getIconLeague, getIconPokemon, getIconRaidEgg } from '@/lib/services/uicons.svelte';

export enum IconCategory {
	POKEMON = "pokemon",
	POKESTOP = "pokestop",
	GYM = "gym",
	STATION = "station",
	INVASION = "invasion",
	ITEM = "item",
	RAID = "raid",
	TYPE = "type",
	FEATURES = "features",
	LEAGUE = "league"
}

export enum IconFeature {
	LEAGUE = "league"
}

type Params = {
	[key: string]: any
}

export function getIcon(category: IconCategory, params: Params) {
	if (category === IconCategory.POKEMON) {
		return getIconPokemon(params)
	} else if (category === IconCategory.FEATURES) {
		if (params?.feature === IconFeature.LEAGUE) {
			return getIconLeague(params.league)
		}
	} else if (category === IconCategory.RAID) {
		return getIconRaidEgg(params.level ?? 0, params.hatched ?? false)
	} else if (category === IconCategory.ITEM) {
		return getIconItem(params.item ?? 0, params.amount ?? 0)
	} else if (category === IconCategory.LEAGUE) {
		return getIconLeague(params.league)
	}

	return getIconPokemon({ pokemon_id: 0 })
}
