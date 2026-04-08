import type { GymData } from "@/lib/types/mapObjectData/gym";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";
import { getActiveGymFilter } from "@/lib/utils/gymUtils";
import type { FiltersetRaid } from "@/lib/features/filters/filtersets";
import type { FilterGym } from "@/lib/features/filters/filters";

export function matchRaidFilterset(
	data: Partial<GymData>,
	gymFilters: FilterGym = getActiveGymFilter()
): FiltersetRaid | undefined {
	if (!gymFilters.enabled || !gymFilters.raid.enabled) return;
	if (gymFilters.raid.filters === undefined) return;

	const filters = gymFilters.raid.filters.filter((f) => f.enabled);
	if (filters.length === 0) return;

	const isEgg = !data.raid_pokemon_id;

	for (const filter of filters) {
		if (filter.show) {
			if (filter.show.includes("egg") && !isEgg) continue;
			if (filter.show.includes("boss") && isEgg) continue;

			if (!filter.levels && !filter.bosses) {
				if (filter.show.includes("egg") && isEgg) return filter;
				if (filter.show.includes("boss") && !isEgg) return filter;
			}
		}

		if (filter.levels?.includes(data.raid_level!)) return filter;

		for (const boss of filter.bosses ?? []) {
			if (
				boss.pokemon_id === data.raid_pokemon_id &&
				(!boss.form || boss.form === data.raid_pokemon_form)
			) {
				return filter;
			}
		}
	}
}

export function shouldDisplayRaid(
	data: Partial<GymData>,
	gymFilters: FilterGym = getActiveGymFilter()
) {
	const timestamp = currentTimestamp();

	// only active raids
	if ((data.raid_end_timestamp ?? 0) < timestamp || !data.raid_level) return false;

	if (isCurrentSelectedOverwrite(data.mapId)) return true;

	// general disabling
	if (!gymFilters.enabled || !gymFilters.raid.enabled) return false;

	// yes if no filtersets
	if (gymFilters.raid.filters === undefined) return true;

	const filters = gymFilters.raid.filters.filter((f) => f.enabled);
	if (filters.length === 0) return true;

	return Boolean(matchRaidFilterset(data, gymFilters));
}
