import type { MinMax, Pokemon, QuestReward } from "@/lib/features/filters/filtersets";
import { mItem, mPokemon, mQuest, mRaid } from "@/lib/services/ingameLocale";
import * as m from "@/lib/paraglide/messages";
import { getGenderLabel } from "@/lib/utils/pokemonUtils";
import { getRewardText } from "@/lib/utils/pokestopUtils";

export function makeAttributeRangeLabel(
	value: MinMax | undefined = undefined,
	min: number,
	max: number,
	minLabel: any = undefined,
	maxLabel: any = undefined
) {
	if (!minLabel) minLabel = value?.min ?? min;
	if (!maxLabel) maxLabel = value?.max ?? max;

	if (value?.max === value?.min) {
		return minLabel;
	}

	if (value?.min === min && value?.max !== max) {
		return m.range_max({ x: maxLabel });
	} else if (value?.min !== min && value?.max === max) {
		return m.range_min({ x: minLabel });
	}
	return m.range_to({ x: minLabel, y: maxLabel });
}

export function makeAttributePokemonLabel(pokemon: Pokemon[]) {
	if (pokemon.length === 1) return mPokemon(pokemon[0]);

	return m.count_pokemon({ count: pokemon.length });
}

export function makeAttributeRaidLevelLabel(levels: number[]) {
	if (levels.length === 1) return mRaid(levels[0], true);

	return m.count_raid_levels({ count: levels.length });
}

export function makeAttributeRaidShowLabel(show: "egg" | "boss") {
	return show === "egg" ? m.raid_show_eggs() : m.raid_show_bosses();
}

export function makeAttributeItemLabel(items: QuestReward[]) {
	if (items.length === 1)
		return m.quest_item({ count: items[0].amount ?? 1, item: mItem(items[0].id) });

	return m.count_items({ count: items.length });
}

export function makeAttributeMegaResourceLabel(energies: QuestReward[]) {
	if (energies.length === 1)
		return m.pokemon_mega_resource({ pokemon: mPokemon({ pokemon_id: Number(energies[0].id) }) });

	return m.count_mega_energies({ count: energies.length });
}

export function makeAttributeTaskLabel(tasks: { title: string; target: number }[]) {
	if (tasks.length === 1) return mQuest(tasks[0].title, tasks[0].target);

	return m.count_tasks({ count: tasks.length });
}

export function makeAttributeRewardPokemonLabel(rewards: QuestReward[]) {
	if (rewards.length === 1) return mPokemon({ pokemon_id: Number(rewards[0].id) });

	return m.count_pokemon({ count: rewards.length });
}
