import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import { getActiveSearch } from "@/lib/features/activeSearch.svelte";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { FilterNest } from "@/lib/features/filters/filters";
import { getUserSettings } from "@/lib/services/userSettings.svelte";

export function getActiveNestFilter() {
	const activeSearch = getActiveSearch();
	if (activeSearch && activeSearch.mapObject === MapObjectType.NEST) {
		return activeSearch.filter as FilterNest;
	}
	return getUserSettings().filters.nest;
}

export function shouldDisplayNest(nest: NestData) {
	if (isCurrentSelectedOverwrite()) return true;

	const nestFilter = getActiveNestFilter();
	if (!nestFilter.enabled) return false;

	const filtersets = nestFilter.filters.filter((f) => f.enabled);
	if (filtersets.length === 0) return true;

	for (const filterset of filtersets) {
		if (
			filterset.pokemon &&
			filterset.pokemon.find(
				(p) => p.pokemon_id === nest.pokemon_id && p.form_id === nest.pokemon_form
			)
		) {
			return true;
		}
	}

	return false;
}