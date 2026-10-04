import { mItem, mPokemon } from "@/lib/services/ingameLocale";
import * as m from "@/lib/i18n/messages.svelte";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";

export function getTappableName(data: TappableData) {
	if (data.pokemon_id) {
		return mPokemon(data);
	} else if (data.item_id) {
		return mItem(data.item_id);
	} else {
		return m.unknown_tappable();
	}
}
