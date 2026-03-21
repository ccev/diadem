import type { TappableData } from "@/lib/types/mapObjectData/tappable";
import { mItem, mPokemon } from "@/lib/services/ingameLocale";
import * as m from "@/lib/paraglide/messages";

export function getTappableName(data: TappableData) {
	if (data.pokemon_id) {
		return mPokemon(data)
	} else if (data.item_id) {
		return mItem(data.item_id)
	} else {
		return m.unknown_tappable()
	}
}