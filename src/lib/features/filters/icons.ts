import { getIconLeague, getIconPokemon, getIconRaidEgg } from '@/lib/services/uicons.svelte';

export enum IconCategory {
	POKEMON = "pokemon",
	POKESTOP = "pokestop",
	GYM = "gym",
	STATION = "station",
	INVASION = "invasion",
	ITEM = "item",
	RAID = "raid",
	TYPE = "type",
	FEATURES = "features"
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
		return getIconRaidEgg(params.level, params.hatched ?? false)
	}
}
