import type {
	AnyFilterset,
	BaseFilterset,
	FiltersetPokemon,
	FiltersetRaid,
	MinMax
} from "@/lib/features/filters/filtersets";
import * as m from '@/lib/paraglide/messages';
import type { FilterCategory } from "@/lib/features/filters/filters";
import { generatePokemonFilterDetails } from "@/lib/features/filters/filterUtilsPokemon";
import { generateRaidFilterDetails } from "@/lib/features/filters/filterUtilsRaid";

export function changeAttributeMinMax(
	data: AnyFilterset,
	attribute: string,
	minBounds: number,
	maxBounds: number,
	min: number,
	max: number
) {
	if (min === minBounds && max === maxBounds) {
		// @ts-ignore
		delete data?.[attribute];
	} else {
		// @ts-ignore
		data[attribute] = { min, max };
	}
}

export function filterTitle(filterset: AnyFilterset | undefined) {
	if (!filterset) return m.unknown_filter()

	if (filterset.title.title) {
		return filterset.title.title
	}
	if (Object.keys(m).includes(filterset.title.message)) {
		// @ts-ignore
		const params = filterset.title.params
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (Object.hasOwn(m, value)) {
					params[key] = m[value]()
				}
			}
		}

		return m[filterset.title.message](params)
	}

	return m.unknown_filter()
}

export function generateFilterDetails(majorCategory: FilterCategory, subCategory: FilterCategory, filtersert: AnyFilterset) {
	// TODO: i think this should be re-run if filter locale differs from client locale.

	if (majorCategory === "pokemon") {
		generatePokemonFilterDetails(filtersert as FiltersetPokemon)
	} else if (subCategory === "quest") {

	} else if (subCategory === "raid") {
		generateRaidFilterDetails(filtersert as FiltersetRaid)
	}
}

export function setFilterIcon(filter: AnyFilterset, options: { uicon?: BaseFilterset["icon"]["uicon"], emoji?: BaseFilterset["icon"]["emoji"] }) {
	if (!filter.icon.isUserSelected) {
		filter.icon.uicon = options.uicon
		filter.icon.emoji = options.emoji
	}
}