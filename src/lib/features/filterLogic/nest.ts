import type { NestData } from "@/lib/types/mapObjectData/nest";
import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";
import { getActiveNestFilter } from "@/lib/utils/nestUtils";
import type { FiltersetNest } from "@/lib/features/filters/filtersets";
import type { FilterNest } from "@/lib/features/filters/filters";

export function matchNestFilterset(
	nest: Partial<NestData>,
	nestFilter: FilterNest = getActiveNestFilter()
): FiltersetNest | undefined {
	if (!nestFilter.enabled) return;

	const filtersets = nestFilter.filters.filter((f) => f.enabled);
	if (filtersets.length === 0) return;

	for (const filterset of filtersets) {
		if (
			filterset.pokemon &&
			filterset.pokemon.find((p) => p.pokemon_id === nest.pokemon_id && p.form === nest.form)
		) {
			return filterset;
		}
	}
}

export function shouldDisplayNest(
	nest: Partial<NestData>,
	nestFilter: FilterNest = getActiveNestFilter()
) {
	if (isCurrentSelectedOverwrite(nest.mapId)) return true;

	if (!nestFilter.enabled) return false;

	const filtersets = nestFilter.filters.filter((f) => f.enabled);
	if (filtersets.length === 0) return true;

	return Boolean(matchNestFilterset(nest, nestFilter));
}
