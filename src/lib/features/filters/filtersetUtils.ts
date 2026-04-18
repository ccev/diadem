import type {
	AnyFilterset,
	BaseFilterset,
	FiltersetInvasion,
	FiltersetMaxBattle,
	FiltersetPokemon,
	FiltersetQuest,
	FiltersetRaid,
	MinMax
} from "@/lib/features/filters/filtersets";
import * as m from "@/lib/paraglide/messages";
import type { FilterCategory } from "@/lib/features/filters/filters";
import { generatePokemonFilterDetails } from "@/lib/features/filters/filterUtilsPokemon";
import { generateRaidFilterDetails } from "@/lib/features/filters/filterUtilsRaid";
import { generateInvasionFilterDetails } from "@/lib/features/filters/filterUtilsInvasion";
import { generateMaxBattleFilterDetails } from "@/lib/features/filters/filterUtilsMaxBattle";
import {
	getIconInvasion,
	getIconPokemon,
	getIconRaidEgg,
	getIconReward
} from "@/lib/services/uicons.svelte";
import { RewardType } from "@/lib/utils/pokestopUtils";
import { RaidLevel } from "@/lib/utils/gymUtils";
import { generateQuestFilterDetails } from "@/lib/features/filters/filterUtilsQuest";

export function changeAttributeMinMax(
	data: AnyFilterset,
	attribute: string,
	minBounds: number,
	maxBounds: number,
	min: number,
	max: number
) {
	if (min === minBounds && max === maxBounds) {
		delete (data as Record<string, unknown>)[attribute];
	} else {
		(data as Record<string, unknown>)[attribute] = { min, max };
	}
}

export function filterTitle(filterset: AnyFilterset | undefined) {
	if (!filterset) return m.unknown_filter();

	if (filterset.title.title) {
		return filterset.title.title;
	}

	if (filterset.title.message in m) {
		// @ts-ignore
		const params = filterset.title.params;
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (Object.hasOwn(m, value)) {
					params[key] = m[value]();
				}
			}
		}

		return m[filterset.title.message](params);
	}
	if (filterset.title.message) {
		return filterset.title.message;
	}

	return m.unknown_filter();
}

export function generateFilterDetails(
	majorCategory: FilterCategory,
	subCategory: FilterCategory,
	filtersert: AnyFilterset
) {
	// TODO: i think this should be re-run if filter locale differs from client locale.

	if (majorCategory === "pokemon") {
		generatePokemonFilterDetails(filtersert as FiltersetPokemon);
	} else if (subCategory === "quest") {
		generateQuestFilterDetails(filtersert as FiltersetQuest);
	} else if (subCategory === "raid") {
		generateRaidFilterDetails(filtersert as FiltersetRaid);
	} else if (subCategory === "invasion") {
		generateInvasionFilterDetails(filtersert as FiltersetInvasion);
	} else if (subCategory === "maxBattle") {
		generateMaxBattleFilterDetails(filtersert as FiltersetMaxBattle);
	}
}

export function getModifierPreviewIcon(data: AnyFilterset): string | undefined {
	if ("bosses" in data || "levels" in data) {
		const raid = data as FiltersetRaid;
		const boss = raid.bosses?.[raid.bosses.length - 1];
		if (boss) return getIconPokemon({ pokemon_id: boss.pokemon_id, form: boss.form });
		return getIconRaidEgg(raid.levels?.[0] ?? RaidLevel.LEGENDARY);
	}

	if ("characters" in data || "rewards" in data) {
		const invasion = data as FiltersetInvasion;
		const reward = invasion.rewards?.[invasion.rewards.length - 1];
		if (reward) return getIconPokemon({ pokemon_id: reward.pokemon_id, form: reward.form });
		const character = invasion.characters?.[invasion.characters.length - 1];
		return getIconInvasion(character ?? 4, true);
	}

	if ("rewardType" in data) {
		const quest = data as FiltersetQuest;
		if (quest.rewardType === RewardType.POKEMON) {
			const pokemon = quest.pokemon?.[quest.pokemon.length - 1];
			if (pokemon)
				return getIconReward(RewardType.POKEMON, {
					pokemon_id: pokemon.pokemon_id,
					form: pokemon.form
				});
			return getIconPokemon({ pokemon_id: 0, form: 0 });
		}
		if (quest.rewardType === RewardType.ITEM) {
			const item = quest.item?.[0];
			if (item)
				return getIconReward(RewardType.ITEM, { item_id: Number(item.id), amount: item.amount });
		}
		if (quest.rewardType === RewardType.STARDUST) {
			return getIconReward(RewardType.STARDUST, {
				amount: quest.stardust?.max ?? quest.stardust?.min
			});
		}
		if (quest.rewardType === RewardType.XP) {
			return getIconReward(RewardType.XP, { amount: quest.xp?.max ?? quest.xp?.min });
		}
		if (quest.rewardType === RewardType.MEGA_ENERGY) {
			const megaResource = quest.megaResource?.[0];
			if (megaResource)
				return getIconReward(RewardType.MEGA_ENERGY, {
					pokemon_id: Number(megaResource.id),
					amount: megaResource.amount
				});
		}
		if (quest.rewardType === RewardType.CANDY) {
			const candy = quest.candy?.[0];
			if (candy)
				return getIconReward(RewardType.CANDY, {
					pokemon_id: Number(candy.id),
					amount: candy.amount
				});
		}
		return undefined;
	}

	// Pokemon and other filtersets with a pokemon array
	const pokemon = (data as FiltersetPokemon).pokemon;
	const selected = pokemon?.[pokemon.length - 1];
	if (selected) return getIconPokemon({ pokemon_id: selected.pokemon_id, form: selected.form });
	return undefined;
}

export function setFilterIcon(
	filter: AnyFilterset,
	options: { uicon?: BaseFilterset["icon"]["uicon"]; emoji?: BaseFilterset["icon"]["emoji"] }
) {
	if (!filter.icon.isUserSelected) {
		filter.icon.uicon = options.uicon;
		filter.icon.emoji = options.emoji;
	}
}
