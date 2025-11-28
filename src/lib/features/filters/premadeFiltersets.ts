import type {
	AnyFilterset,
	BaseFilterset,
	FiltersetPokemon,
	FiltersetQuest,
	Pokemon
} from "@/lib/features/filters/filtersets";
import type { FilterCategory } from '@/lib/features/filters/filters';
import { filtersetPageNew } from '@/lib/features/filters/filtersetPages.svelte';
import { IconCategory, IconFeature } from "@/lib/features/filters/icons";
import { League } from '@/lib/services/uicons.svelte';

export const premadeFiltersets: { [key in FilterCategory]: FiltersetPokemon[] } = {
	pokemon: [
		filtersetPokemon({
			emoji: '💯',
			title: 'filter_template_hundo',
			iv: { min: 100, max: 100 }
		}),
		filtersetPokemon({
			uicon: {
				category: IconCategory.FEATURES,
				params: {
					feature: IconFeature.LEAGUE,
					league: League.GREAT
				}
			},
			title: 'filter_template_rank1_great',
			pvpRankGreat: { min: 1, max: 1 }
		}),
		filtersetPokemon({
			uicon: {
				category: IconCategory.FEATURES,
				params: {
					feature: IconFeature.LEAGUE,
					league: League.ULTRA
				}
			},
			title: 'filter_template_rank1_ultra',
			pvpRankGreat: { min: 1, max: 1 }
		}),
		filtersetPokemon({
			emoji: '🗑️',
			title: 'filter_template_nundo',
			iv: { min: 0, max: 0 }
		}),
		filtersetPokemon({
			emoji: '📏',
			title: 'filter_template_xxl',
			size: { min: 5, max: 5 }
		}),
		filtersetPokemon({
			uicon: {
				category: IconCategory.POKEMON,
				params: { pokemon_id: 201, form: 6 }
			},
			title: 'filter_template_unown',
			pokemon: Array.from({ length: 28 }, (_, i) => i + 1).map(i => ({ pokemon_id: 201, form: i }))
		}),
		filtersetPokemon({
			uicon: {
				category: IconCategory.POKEMON,
				params: { pokemon_id: 480, form: 0 }
			},
			title: 'filter_template_sea_trio',
			pokemon: [ { pokemon_id: 480, form: 0 }, { pokemon_id: 481, form: 0 }, { pokemon_id: 482, form: 0 } ]
		})
	],
	quest: [
	]
}

type BaseParams = {
	emoji?: BaseFilterset["icon"]["emoji"],
	uicon?: BaseFilterset["icon"]["uicon"],
	title: BaseFilterset["title"]["message"],
}

type Params<Filterset extends AnyFilterset> = BaseParams & Partial<Omit<Filterset, keyof BaseFilterset>>

function baseFilterset(options: BaseParams): BaseFilterset {
	const data: BaseFilterset =  {
		id: crypto.randomUUID(),
		icon: {
			isUserSelected: false,
		},
		title: {
			message: options.title,
		},
		enabled: true,
	}
	if (options.uicon) data.icon.uicon = options.uicon
	if (options.emoji) data.icon.emoji = options.emoji

	delete options.title
	delete options.uicon
	delete options.emoji

	return data
}

function filtersetPokemon(options: Params<FiltersetPokemon>): FiltersetPokemon {
	return {...baseFilterset(options), ...options}
}

function filtersetQuest(options: Params<FiltersetQuest>): FiltersetQuest {
	return {...baseFilterset(options), ...options}
}