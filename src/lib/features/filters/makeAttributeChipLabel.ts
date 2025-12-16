import type { MinMax, Pokemon } from "@/lib/features/filters/filtersets";
import { mPokemon, mRaid } from '@/lib/services/ingameLocale';
import * as m from '@/lib/paraglide/messages';
import { getGenderLabel } from '@/lib/utils/pokemonUtils';

export function makeAttributeRangeLabel(value: MinMax | undefined = undefined, min: number, max: number, minLabel: any = undefined, maxLabel: any = undefined) {
	if (!minLabel) minLabel = value?.min ?? min
	if (!maxLabel) maxLabel = value?.max ?? max

	if (value?.max === value?.min) {
		return minLabel
	}

	if (value?.min === min && value?.max !== max) {
		return m.range_max({ x: maxLabel })
	} else if (value?.min !== min && value?.max === max) {
		return m.range_min({ x: minLabel })
	}
	return m.range_to({ x: minLabel, y: maxLabel })
}

export function makeAttributePokemonLabel(pokemon: Pokemon[]) {
	if (pokemon.length === 1) return mPokemon(pokemon[0])

	return m.count_pokemon({ count: pokemon.length })
}

export function makeAttributeRaidLevelLabel(levels: number[]) {
	if (levels.length === 1) return mRaid(levels[0], true)

	return m.count_raid_levels({ count: levels.length })
}

export function makeAttributeRaidShowLabel(show: "egg" | "boss") {
	return show
}