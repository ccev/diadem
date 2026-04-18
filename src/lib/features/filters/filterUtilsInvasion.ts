import { mCharacter, mPokemon } from "@/lib/services/ingameLocale";
import * as m from "@/lib/paraglide/messages";
import { INVASION_CHARACTER_LEADERS } from "@/lib/utils/pokestopUtils";
import type { FiltersetInvasion, FiltersetTitle } from "@/lib/features/filters/filtersets";
import { setFilterIcon } from "@/lib/features/filters/filtersetUtils";
import { IconCategory } from "@/lib/features/filters/icons";
import { getActiveCharacters, getInvasionCatchable } from "@/lib/features/masterStats.svelte";
import { getId } from "@/lib/utils/uuid";

export enum InvasionFilterType {
	CHARACTERS = "characters",
	REWARDS = "rewards"
}

export function makeAttributeCharacterLabel(characters: number[]) {
	if (characters.length === 1) return mCharacter(characters[0]);

	const onlyGiovanni = characters.every((c) => [44, 46].includes(c));
	if (onlyGiovanni) return mCharacter(44);

	const onlyLeaders = characters.every((c) => INVASION_CHARACTER_LEADERS.includes(c));
	if (onlyLeaders) return m.count_leaders({ count: characters.length });

	return m.count_characters({ count: characters.length });
}

export function generateInvasionFilterDetails(filter: FiltersetInvasion) {
	const title: FiltersetTitle = {
		title: filter.title.title,
		message: "filter_template_invasion_fallback"
	};
	setFilterIcon(filter, {
		uicon: { category: IconCategory.INVASION, params: { character: 4 } }
	}); // male grunt as default

	if (filter.rewards?.length) {
		if (filter.rewards.length === 1) {
			title.message = "filter_template_pokemon_invasion";
			title.params = { pokemon: mPokemon(filter.rewards[0]) };

			setFilterIcon(filter, {
				uicon: { category: IconCategory.POKEMON, params: filter.rewards[0] }
			});
		} else {
			title.message = "count_pokemon";
			title.params = { count: filter.rewards.length.toString() };

			setFilterIcon(filter, {
				uicon: { category: IconCategory.POKEMON, params: filter.rewards[0] }
			});
		}
	} else if (filter.characters) {
		if (filter.characters.length === 1) {
			if (
				INVASION_CHARACTER_LEADERS.includes(filter.characters[0]) ||
				[4, 5].includes(filter.characters[0])
			) {
				title.message = mCharacter(filter.characters[0]);
			} else {
				title.message = "filter_template_invasion_one_grunt";
				title.params = { type: mCharacter(filter.characters[0]) };
			}

			setFilterIcon(filter, {
				uicon: { category: IconCategory.INVASION, params: { character: filter.characters[0] } }
			});
		} else if (filter.characters.every((c) => [44, 46].includes(c))) {
			title.message = "filter_template_invasion_giovanni";
			setFilterIcon(filter, {
				uicon: { category: IconCategory.INVASION, params: { character: 44 } }
			});
		} else if (filter.characters.every((c) => INVASION_CHARACTER_LEADERS.includes(c))) {
			title.message = "count_leaders";
			title.params = { count: filter.characters.length.toString() };
			setFilterIcon(filter, {
				uicon: { category: IconCategory.INVASION, params: { character: filter.characters[0] } }
			});
		} else {
			title.message = "count_characters";
			title.params = { count: filter.characters.length.toString() };
			setFilterIcon(filter, {
				uicon: { category: IconCategory.INVASION, params: { character: filter.characters[0] } }
			});
		}
	}

	filter.title = title;
}

export function getPremadeInvasionFiltersets(): FiltersetInvasion[] | undefined {
	const activeCharacters = getActiveCharacters();
	if (!activeCharacters.length) return;

	const filters: FiltersetInvasion[] = [];
	const rewardFilters: FiltersetInvasion[] = [];

	filters.push(
		createInvasionPremadeFilterset({
			message: m.filter_template_invasion_leaders(),
			characters: [...INVASION_CHARACTER_LEADERS]
		})
	);

	for (const leaderId of [41, 42, 43]) {
		filters.push(
			createInvasionPremadeFilterset({
				characters: [leaderId]
			})
		);
	}

	filters.push(
		createInvasionPremadeFilterset({
			characters: [44, 46]
		})
	);

	const rarestGrunts = [...activeCharacters]
		.filter((character) => !INVASION_CHARACTER_LEADERS.includes(character.character))
		.sort((a, b) => a.count - b.count)
		.slice(0, 10);

	for (const grunt of rarestGrunts) {
		filters.push(
			createInvasionPremadeFilterset({
				characters: [grunt.character]
			})
		);

		const rewards = getInvasionCatchable(grunt.character);
		if (rewards?.length) {
			for (const reward of rewards) {
				rewardFilters.push(
					createInvasionPremadeFilterset({
						rewards: [{ pokemon_id: reward.pokemon_id, form: reward.form }]
					})
				);
			}
		}
	}

	filters.push(...rewardFilters);

	return filters;
}

function createInvasionPremadeFilterset(params: {
	message?: FiltersetTitle["message"];
	characters?: number[];
	rewards?: { pokemon_id: number; form: number }[];
}): FiltersetInvasion {
	const filter: FiltersetInvasion = {
		id: getId(),
		icon: {
			isUserSelected: false
		},
		title: {
			message: params.message ?? "filter_template_invasion_fallback"
		},
		enabled: true,
		characters: params.characters,
		rewards: params.rewards
	};

	generateInvasionFilterDetails(filter);
	if (params.message) filter.title.message = params.message;

	return filter;
}
