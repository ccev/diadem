import type {
	AnyFilterset,
	BaseFilterset,
	FiltersetPokemon,
	FiltersetRaid
} from "@/lib/features/filters/filtersets";
import type { FilterCategory } from "@/lib/features/filters/filters";
import { IconCategory, IconFeature } from "@/lib/features/filters/icons";
import { League } from "@/lib/services/uicons.svelte";
import { getId } from "@/lib/utils/uuid";
import { RaidLevel } from "@/lib/utils/gymUtils";

export const premadeFiltersets: { [key in FilterCategory]?: FiltersetPokemon[] } = {
	pokemon: [
		filterset<FiltersetPokemon>({
			emoji: "💯",
			title: "filter_template_hundo",
			iv: { min: 100, max: 100 }
		}),
		filterset<FiltersetPokemon>({
			uicon: {
				category: IconCategory.FEATURES,
				params: {
					feature: IconFeature.LEAGUE,
					league: League.GREAT
				}
			},
			title: "filter_template_rank1_great",
			pvpRankGreat: { min: 1, max: 1 }
		}),
		filterset<FiltersetPokemon>({
			uicon: {
				category: IconCategory.FEATURES,
				params: {
					feature: IconFeature.LEAGUE,
					league: League.ULTRA
				}
			},
			title: "filter_template_rank1_ultra",
			pvpRankUltra: { min: 1, max: 1 }
		}),
		filterset<FiltersetPokemon>({
			emoji: "🗑️",
			title: "filter_template_nundo",
			iv: { min: 0, max: 0 }
		}),
		filterset<FiltersetPokemon>({
			emoji: "📏",
			title: "filter_template_xxl",
			size: { min: 5, max: 5 }
		}),
		filterset<FiltersetPokemon>({
			uicon: {
				category: IconCategory.POKEMON,
				params: { pokemon_id: 201, form: 6 }
			},
			title: "filter_template_unown",
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
			title: "filter_template_sea_trio",
			pokemon: [
				{ pokemon_id: 480, form: 0 },
				{ pokemon_id: 481, form: 0 },
				{ pokemon_id: 482, form: 0 }
			]
		})
	],
	quest: [],
	raid: [
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.LEGENDARY }
			},
			title: "filter_template_raids_5",
			levels: [RaidLevel.LEGENDARY]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.SHADOW_LEGENDARY }
			},
			title: "filter_template_raids_5_shadow",
			levels: [RaidLevel.SHADOW_LEGENDARY]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.ULTRA_BEAST }
			},
			title: "filter_template_raids_ultra_beast",
			levels: [RaidLevel.ULTRA_BEAST]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.MEGA }
			},
			title: "filter_template_raids_mega",
			levels: [RaidLevel.MEGA]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.MEGA_LEGENDARY }
			},
			title: "filter_template_raids_mega_legendary",
			levels: [RaidLevel.MEGA_LEGENDARY]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.PRIMAL }
			},
			title: "filter_template_raids_primal",
			levels: [RaidLevel.PRIMAL]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.ELITE }
			},
			title: "filter_template_raids_elite",
			levels: [RaidLevel.ELITE]
		}),
		filterset<FiltersetRaid>({
			uicon: {
				category: IconCategory.RAID,
				params: { level: RaidLevel.SHADOW_STAR_3 }
			},
			title: "filter_template_raids_shadow",
			levels: [RaidLevel.SHADOW_STAR_1, RaidLevel.SHADOW_STAR_3, RaidLevel.SHADOW_LEGENDARY]
		}),
	]
};

type BaseParams = {
	emoji?: BaseFilterset["icon"]["emoji"];
	uicon?: BaseFilterset["icon"]["uicon"];
	title: BaseFilterset["title"]["message"];
};

type Params<Filterset extends AnyFilterset> = BaseParams &
	Partial<Omit<Filterset, keyof BaseFilterset>>;

function filterset<Filterset extends AnyFilterset>(options: Params<Filterset>): Filterset {
	const { title, uicon, emoji, ...rest } = options;

	const data: Filterset = {
		id: getId(),
		icon: {
			isUserSelected: false
		},
		title: {
			message: title
		},
		enabled: true,
		...rest
	};
	if (uicon) data.icon.uicon = uicon;
	if (emoji) data.icon.emoji = emoji;

	return data;
}
