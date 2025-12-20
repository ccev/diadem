import type { FiltersetRaid, FiltersetTitle } from "@/lib/features/filters/filtersets";
import { m } from "@/lib/paraglide/messages";
import { RaidLevel } from "@/lib/utils/gymUtils";
import { mPokemon } from "@/lib/services/ingameLocale";
import { setFilterIcon } from "@/lib/features/filters/filtersetUtils";
import { IconCategory } from "@/lib/features/filters/icons";

export function generateRaidFilterDetails(filter: FiltersetRaid): FiltersetRaid {
	const title: FiltersetTitle = {
		title: filter.title.title,
		message: "filter_template_raids_fallback"
	};
	setFilterIcon(filter, {
		uicon: { category: IconCategory.RAID, params: { level: RaidLevel.STAR_1 } }
	});

	if ((filter.levels && filter.levels.length > 0) || filter.show) {
		let kind: keyof typeof m = "filter_template_raids_raids";
		if (filter.show && filter.show.includes("egg")) {
			kind = "filter_template_raids_eggs";
		} else if (filter.show && filter.show.includes("boss")) {
			kind = "filter_template_raids_bosses";
			setFilterIcon(filter, {
				uicon: { category: IconCategory.RAID, params: { level: RaidLevel.STAR_1, hatched: 1 } }
			});
		}

		title.params = { kind };

		if (!filter.levels || filter.levels.length === 0) {
			title.message = "filter_template_raids_all";
		} else if (filter.levels.length > 1) {
			setFilterIcon(filter, {
				uicon: { category: IconCategory.RAID, params: { level: filter.levels[0] } }
			});
			title.message = "filter_template_levels_various";
		} else {
			setFilterIcon(filter, {
				uicon: { category: IconCategory.RAID, params: { level: filter.levels[0] } }
			});
			switch (filter.levels[0]) {
				case RaidLevel.STAR_1:
					title.message = "filter_template_levels_1_star";
					break;
				case RaidLevel.SHADOW_STAR_1:
					title.message = "filter_template_levels_1_star_shadow";
					break;
				case RaidLevel.STAR_3:
					title.message = "filter_template_levels_3_star";
					break;
				case RaidLevel.SHADOW_STAR_3:
					title.message = "filter_template_levels_3_star_shadow";
					break;
				case RaidLevel.LEGENDARY:
					title.message = "filter_template_levels_legendary";
					break;
				case RaidLevel.SHADOW_LEGENDARY:
					title.message = "filter_template_levels_legendary_shadow";
					break;
				case RaidLevel.MEGA:
					title.message = "filter_template_levels_mega";
					break;
				case RaidLevel.MEGA_LEGENDARY:
					title.message = "filter_template_levels_mega_legendary";
					break;
				case RaidLevel.PRIMAL:
					title.message = "filter_template_levels_primal";
					break;
				case RaidLevel.ULTRA_BEAST:
					title.message = "filter_template_levels_ultra_beast";
					break;
				case RaidLevel.ELITE:
					title.message = "filter_template_levels_elite";
					break;
			}
		}
	} else if (filter.bosses && filter.bosses.length > 0) {
		if (filter.bosses.length === 1) {
			setFilterIcon(filter, { uicon: { category: IconCategory.POKEMON, params: filter.bosses[0] } });

			title.message = "filter_template_pokemon_raids";
			// TODO: this shuld be called in filterTitle, not here. for proper i18n
			title.params = { pokemon: mPokemon(filter.bosses[0]) };
		} else {
			setFilterIcon(filter, {
				uicon: { category: IconCategory.RAID, params: { level: RaidLevel.STAR_1, hatched: 1 } }
			});

			title.message = "count_pokemon";
			title.params = { count: filter.bosses.length };
		}
	}

	filter.title = title;

	return filter;
}
