import {
	getIconInvasion,
	getIconItem,
	getIconLeague,
	getIconPokemon,
	getIconRaidEgg,
	getIconStation,
	getIconType,
	getIconTeam,
	getIconPokestopDirect,
	getIconGymDirect,
	getIconReward,
	getIconPokestop
} from "@/lib/services/uicons.svelte";
import { RewardType } from "@/lib/utils/pokestopUtils";

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
	LEAGUE = "league",
	MISC = "misc"
}

export enum IconFeature {
	LEAGUE = "league"
}

type Params = {
	[key: string]: any;
};

export function getIcon(category: IconCategory, params: Params) {
	if (category === IconCategory.POKEMON) {
		return getIconPokemon(params);
	} else if (category === IconCategory.FEATURES) {
		if (params?.feature === IconFeature.LEAGUE) {
			return getIconLeague(params.league);
		}
	} else if (category === IconCategory.RAID) {
		return getIconRaidEgg(params.level ?? 0, params.hatched ?? false);
	} else if (category === IconCategory.ITEM) {
		return getIconItem(params.item ?? 0, params.amount ?? 0);
	} else if (category === IconCategory.LEAGUE) {
		return getIconLeague(params.league);
	} else if (category === IconCategory.INVASION) {
		return getIconInvasion(params.character, params.confirmed ?? true);
	} else if (category === IconCategory.POKESTOP) {
		return getIconPokestopDirect(
			params.lure_id ?? 0,
			params.display_type ?? false,
			params.quest_active ?? false,
			params.ar ?? false
		);
	} else if (category === IconCategory.GYM) {
		return getIconGymDirect(params.team_id ?? 0);
	} else if (category === IconCategory.MISC) {
		if (params.misc_type === "team") return getIconTeam(params.team ?? 0);
		if (params.misc_type === "stardust") return getIconReward(RewardType.STARDUST, { amount: 0 });
		if (params.misc_type === "candy")
			return getIconReward(RewardType.CANDY, { pokemon_id: params.pokemon_id });
		if (params.misc_type === "xl_candy")
			return getIconReward(RewardType.XL_CANDY, { pokemon_id: params.pokemon_id });
		if (params.misc_type === "mega_resource")
			return getIconReward(RewardType.MEGA_ENERGY, { amount: 0 });
	} else if (category === IconCategory.STATION) {
		return getIconStation(params);
	} else if (category === IconCategory.TYPE) {
		return getIconType(params.type ?? 0);
	}

	return getIconPokemon({ pokemon_id: 0 });
}
