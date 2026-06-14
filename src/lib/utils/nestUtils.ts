import { getActiveSearch } from "@/lib/features/activeSearch.svelte";
import type { FilterNest } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getUserSettings } from "@/lib/services/userSettings.svelte";

export function getActiveNestFilter() {
	const activeSearch = getActiveSearch();
	if (activeSearch && activeSearch.mapObject === MapObjectType.NEST) {
		return activeSearch.filter as FilterNest;
	}
	return getUserSettings().filters.nest;
}
