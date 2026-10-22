import type { MinMax, Pokemon, QuestReward } from "@/lib/features/filters/filtersets";

import { mItem, mPokemon, mQuest, mRaid } from "@/lib/services/ingameLocale";

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
		return /* @wc-include */ `≤${maxLabel}`;
	} else if (value?.min !== min && value?.max === max) {
		return /* @wc-include */ `${minLabel}+`;
	}
	return /* @wc-include */ `${minLabel} – ${maxLabel}`;
}

export function makeAttributePokemonLabel(pokemon: Pokemon[]) {
	if (pokemon.length === 1) return mPokemon(pokemon[0]);

	return `${pokemon.length} Pokémon`;
}

export function makeAttributeRaidLevelLabel(levels: number[]) {
	if (levels.length === 1) return mRaid(levels[0], true);

	return `${levels.length} Raid levels`;
}

export function makeAttributeRaidShowLabel(show: "egg" | "boss") {
	return show === "egg" ? "Eggs" : "Bosses";
}

export function makeAttributeItemLabel(items: QuestReward[]) {
	if (items.length === 1) return /* @wc-include */ `${items[0].amount ?? 1}x ${mItem(items[0].id)}`;

	return `${items.length} Items`;
}

export function makeAttributeMegaResourceLabel(energies: QuestReward[]) {
	if (energies.length === 1)
		return `${mPokemon({ pokemon_id: Number(energies[0].id) })} Mega Energy`;

	return `${energies.length} Mega Energies`;
}

export function makeAttributeTaskLabel(tasks: { title: string; target: number }[]) {
	if (tasks.length === 1) return mQuest(tasks[0].title, tasks[0].target);

	return `${tasks.length} Tasks`;
}

export function makeAttributeRewardPokemonLabel(rewards: QuestReward[]) {
	if (rewards.length === 1) return mPokemon({ pokemon_id: Number(rewards[0].id) });

	return `${rewards.length} Pokémon`;
}
