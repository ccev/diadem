import type { FilterCategory } from "@/lib/features/filters/filters";
import type {
	AnyFilterset,
	BaseFilterset,
	FiltersetPokemon,
	FiltersetRaid
} from "@/lib/features/filters/filtersets";
import { getPremadeInvasionFiltersets } from "@/lib/features/filters/filterUtilsInvasion";
import { getPremadeQuestFiltersets } from "@/lib/features/filters/filterUtilsQuest";
import { IconCategory, IconFeature } from "@/lib/features/filters/icons";
import { MODIFIER_COLORS } from "@/lib/features/filters/modifierPresets";
import { RaidLevel } from "@/lib/utils/gymUtils";
import { League } from "@/lib/utils/pokemonUtils";
import { getId } from "@/lib/utils/uuid";

export const premadeFiltersets: { [key in FilterCategory]?: AnyFilterset[] } = {
	pokemon: [
		filterset<FiltersetPokemon>({
			emoji: "💯",
			title: /* @wc-ignore */ "100% IV",
			iv: { min: 100, max: 100 },
			modifiers: {
				glow: {
					color: MODIFIER_COLORS.red
				}
			}
		}),
		filterset<FiltersetPokemon>({
			uicon: {
				category: IconCategory.FEATURES,
				params: {
					feature: IconFeature.LEAGUE,
					league: League.GREAT
				}
			},
			title: /* @wc-ignore */ "Rank 1 Great League",
			pvpRankGreat: { min: 1, max: 1 },
			modifiers: {
				glow: {
					color: MODIFIER_COLORS.blue
				},
				showBadge: true
			}
		}),
		filterset<FiltersetPokemon>({
			uicon: {
				category: IconCategory.FEATURES,
				params: {
					feature: IconFeature.LEAGUE,
					league: League.ULTRA
				}
			},
			title: /* @wc-ignore */ "Rank 1 Ultra League",
			pvpRankUltra: { min: 1, max: 1 },
			modifiers: {
				glow: {
					color: MODIFIER_COLORS.yellow
				},
				showBadge: true
			}
		}),
		filterset<FiltersetPokemon>({
			emoji: "🗑️",
			title: /* @wc-ignore */ "0% IV",
			iv: { min: 0, max: 0 },
			modifiers: {
				rotation: 180
			}
		}),
		filterset<FiltersetPokemon>({
			emoji: "📏",
			title: /* @wc-ignore */ "All XXL",
			size: { min: 5, max: 5 }
		}),
		filterset<FiltersetPokemon>({
			uicon: {
				category: IconCategory.POKEMON,
				params: { pokemon_id: 201, form: 6 }
			},
			title: /* @wc-ignore */ "Unown",
			pokemon: Array.from({ length: 28 }, (_, i) => i + 1).map((i) => ({
				pokemon_id: 201,
				form: i
			}))
		}),
		filterset<FiltersetPokemon>({
			uicon: {
				category: IconCategory.POKEMON,
				params: { pokemon_id: 480, form: 0 }
			},
			title: /* @wc-ignore */ "Lake Trio",
			pokemon: [
				{ pokemon_id: 480, form: 0 },
				{ pokemon_id: 481, form: 0 },
				{ pokemon_id: 482, form: 0 }
			]
		})
	],
	raid: [
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.LEGENDARY }
			},
			title: /* @wc-ignore */ "Legendary Raids",
			levels: [RaidLevel.LEGENDARY]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.SHADOW_LEGENDARY }
			},
			title: /* @wc-ignore */ "Legendary Shadow Raids",
			levels: [RaidLevel.SHADOW_LEGENDARY]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.ULTRA_BEAST }
			},
			title: /* @wc-ignore */ "Ultra Beast Raids",
			levels: [RaidLevel.ULTRA_BEAST]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.MEGA }
			},
			title: /* @wc-ignore */ "Mega Raids",
			levels: [RaidLevel.MEGA]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.MEGA_LEGENDARY }
			},
			title: /* @wc-ignore */ "Mega Legendary Raids",
			levels: [RaidLevel.MEGA_LEGENDARY]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.PRIMAL }
			},
			title: /* @wc-ignore */ "Primal Raids",
			levels: [RaidLevel.PRIMAL]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.ELITE }
			},
			title: /* @wc-ignore */ "Elite Raids",
			levels: [RaidLevel.ELITE]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.MEGA_SUPER }
			},
			title: /* @wc-ignore */ "Super Mega Raids",
			levels: [RaidLevel.MEGA_SUPER]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.MEGA_SUPER_LEGENDARY }
			},
			title: /* @wc-ignore */ "Legendary Super Mega Raids",
			levels: [RaidLevel.MEGA_SUPER_LEGENDARY]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.SHADOW_STAR_3 }
			},
			title: /* @wc-ignore */ "Shadow Raids",
			levels: [RaidLevel.SHADOW_STAR_1, RaidLevel.SHADOW_STAR_3, RaidLevel.SHADOW_LEGENDARY]
		})
	]
};

export function getPremadeFiltersets(category: FilterCategory) {
	const filters = [...(premadeFiltersets[category] ?? [])];

	if (category === "quest") {
		const questFilters = getPremadeQuestFiltersets();
		if (!questFilters) return;
		filters.push(...questFilters);
	} else if (category === "invasion") {
		const invasionFilters = getPremadeInvasionFiltersets();
		if (!invasionFilters) return;
		filters.push(...invasionFilters);
	}

	if (!filters.length) return;

	return filters;
}

type BaseParams = {
	emoji?: BaseFilterset["icon"]["emoji"];
	uicon?: BaseFilterset["icon"]["uicon"];
	modifiers?: BaseFilterset["modifiers"];
	title: BaseFilterset["title"]["message"];
};

type Params<Filterset extends AnyFilterset> = BaseParams &
	Partial<Omit<Filterset, keyof BaseFilterset>>;

function filterset<Filterset extends AnyFilterset>(options: Params<Filterset>): Filterset {
	const { title, uicon, emoji, ...rest } = options;

	const data = {
		id: getId(),
		icon: {
			isUserSelected: false
		},
		title: {
			message: title
		},
		enabled: true,
		...rest
	} as unknown as Filterset;
	if (uicon) data.icon.uicon = uicon;
	if (emoji) data.icon.emoji = emoji;

	return data;
}
