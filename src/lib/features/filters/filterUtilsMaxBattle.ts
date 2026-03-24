import type { FiltersetMaxBattle, FiltersetTitle } from "@/lib/features/filters/filtersets";
import { mPokemon } from "@/lib/services/ingameLocale";
import { setFilterIcon } from "@/lib/features/filters/filtersetUtils";
import { IconCategory } from "@/lib/features/filters/icons";

export function generateMaxBattleFilterDetails(filter: FiltersetMaxBattle): FiltersetMaxBattle {
	const title: FiltersetTitle = {
		title: filter.title.title,
		message: "filter_template_max_battle_fallback"
	};

	setFilterIcon(filter, {
		uicon: { category: IconCategory.STATION, params: true }
	});

	if (filter.bosses && filter.bosses.length > 0) {
		if (filter.bosses.length === 1) {
			title.message = "filter_template_pokemon_max_battles";
			title.params = { pokemon: mPokemon({ pokemon_id: filter.bosses[0].pokemon_id, form: filter.bosses[0].form }) };

			setFilterIcon(filter, {
				uicon: { category: IconCategory.POKEMON, params: filter.bosses[0] }
			});
		} else {
			title.message = "count_pokemon";
			title.params = { count: filter.bosses.length.toString() };

			setFilterIcon(filter, {
				uicon: { category: IconCategory.POKEMON, params: filter.bosses[0] }
			});
		}
	} else if (filter.isActive !== undefined) {
		title.message = filter.isActive ? "max_battle_active" : "max_battle_inactive";
	}

	filter.title = title;
	return filter;
}
