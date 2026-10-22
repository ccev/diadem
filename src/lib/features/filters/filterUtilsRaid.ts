import type { FiltersetRaid, FiltersetTitle } from "@/lib/features/filters/filtersets";
import { setFilterIcon } from "@/lib/features/filters/filtersetUtils.svelte";
import { IconCategory } from "@/lib/features/filters/icons";

import { mPokemon } from "@/lib/services/ingameLocale";
import { RaidLevel } from "@/lib/utils/gymUtils";

export function generateRaidFilterDetails(filter: FiltersetRaid): FiltersetRaid {
	const title: FiltersetTitle = {
		title: filter.title.title,
		message: /* @wc-ignore */ "Raid Filter"
	};
	setFilterIcon(filter, {
		uicon: { category: IconCategory.RAID, params: { level: RaidLevel.STAR_1 } }
	});

	if ((filter.levels && filter.levels.length > 0) || filter.show) {
		let kind: string = /* @wc-ignore */ "Raids";
		if (filter.show && filter.show.includes("egg")) {
			kind = /* @wc-ignore */ "Eggs";
		} else if (filter.show && filter.show.includes("boss")) {
			kind = /* @wc-ignore */ "Bosses";
			setFilterIcon(filter, {
				uicon: { category: IconCategory.RAID, params: { level: RaidLevel.STAR_1, hatched: 1 } }
			});
		}

		title.params = { kind };

		if (!filter.levels || filter.levels.length === 0) {
			title.message = /* @wc-ignore */ "All {kind}";
		} else if (filter.levels.length > 1) {
			setFilterIcon(filter, {
				uicon: { category: IconCategory.RAID, params: { level: filter.levels[0] } }
			});
			title.message = /* @wc-ignore */ "Various {kind}";
		} else {
			setFilterIcon(filter, {
				uicon: { category: IconCategory.RAID, params: { level: filter.levels[0] } }
			});
			switch (filter.levels[0]) {
				case RaidLevel.STAR_1:
					title.message = /* @wc-ignore */ "★ {kind}";
					break;
				case RaidLevel.SHADOW_STAR_1:
					title.message = /* @wc-ignore */ "Shadow ★ {kind}";
					break;
				case RaidLevel.STAR_3:
					title.message = /* @wc-ignore */ "★★★ {kind}";
					break;
				case RaidLevel.SHADOW_STAR_3:
					title.message = /* @wc-ignore */ "Shadow ★★★ {kind}";
					break;
				case RaidLevel.LEGENDARY:
					title.message = /* @wc-ignore */ "Legendary {kind}";
					break;
				case RaidLevel.SHADOW_LEGENDARY:
					title.message = /* @wc-ignore */ "Legendary Shadow {kind}";
					break;
				case RaidLevel.MEGA:
					title.message = /* @wc-ignore */ "Mega {kind}";
					break;
				case RaidLevel.MEGA_LEGENDARY:
					title.message = /* @wc-ignore */ "Mega Legendary {kind}";
					break;
				case RaidLevel.PRIMAL:
					title.message = /* @wc-ignore */ "Primal {kind}";
					break;
				case RaidLevel.ULTRA_BEAST:
					title.message = /* @wc-ignore */ "Ultra Beast {kind}";
					break;
				case RaidLevel.ELITE:
					title.message = /* @wc-ignore */ "Elite {kind}";
					break;
				case RaidLevel.MEGA_SUPER:
				case RaidLevel.MEGA_SUPER_LEGENDARY:
					title.message = /* @wc-ignore */ "Super Mega {kind}";
					break;
			}
		}
	} else if (filter.bosses && filter.bosses.length > 0) {
		if (filter.bosses.length === 1) {
			setFilterIcon(filter, {
				uicon: { category: IconCategory.POKEMON, params: filter.bosses[0] }
			});

			title.message = /* @wc-ignore */ "{pokemon} Raids";
			// TODO: this shuld be called in filterTitle, not here. for proper i18n
			title.params = { pokemon: mPokemon(filter.bosses[0]) };
		} else {
			setFilterIcon(filter, {
				uicon: { category: IconCategory.RAID, params: { level: RaidLevel.STAR_1, hatched: 1 } }
			});

			title.message = /* @wc-ignore */ "{count} Pokémon";
			title.params = { count: filter.bosses.length.toString() };
		}
	}

	filter.title = title;

	return filter;
}
