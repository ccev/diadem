import type { FiltersetMaxBattle, FiltersetTitle } from "@/lib/features/filters/filtersets";
import { setFilterIcon } from "@/lib/features/filters/filtersetUtils.svelte";
import { IconCategory } from "@/lib/features/filters/icons";
import { mPokemon } from "@/lib/services/ingameLocale";

export function generateMaxBattleFilterDetails(filter: FiltersetMaxBattle): FiltersetMaxBattle {
	const title: FiltersetTitle = {
		title: filter.title.title,
		message: /* @wc-ignore */ "Max Battle Filter"
	};

	setFilterIcon(filter, {
		uicon: { category: IconCategory.STATION, params: true as unknown as Record<string, any> }
	});

	if (filter.bosses && filter.bosses.length > 0) {
		if (filter.bosses.length === 1) {
			title.message = /* @wc-ignore */ "{pokemon} Max Battles";
			title.params = {
				pokemon: mPokemon({ pokemon_id: filter.bosses[0].pokemon_id, form: filter.bosses[0].form })
			};

			setFilterIcon(filter, {
				uicon: { category: IconCategory.POKEMON, params: filter.bosses[0] }
			});
		} else {
			title.message = /* @wc-ignore */ "{count} Pokémon";
			title.params = { count: filter.bosses.length.toString() };

			setFilterIcon(filter, {
				uicon: { category: IconCategory.POKEMON, params: filter.bosses[0] }
			});
		}
	} else if (filter.isActive !== undefined) {
		title.message = filter.isActive ? /* @wc-ignore */ "Active" : /* @wc-ignore */ "Inactive";
	}

	filter.title = title;
	return filter;
}
