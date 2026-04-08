import type { StationData } from "@/lib/types/mapObjectData/station";
import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";
import { getActiveStationFilter, isMaxBattleActive } from "@/lib/utils/stationUtils";
import type { FiltersetMaxBattle } from "@/lib/features/filters/filtersets";
import type { FilterStation } from "@/lib/features/filters/filters";

export function matchMaxBattleFilterset(
	station: Partial<StationData>,
	stationFilter: FilterStation = getActiveStationFilter()
): FiltersetMaxBattle | undefined {
	if (!stationFilter.enabled) return;

	const maxBattleFilters = stationFilter.maxBattle.filters.filter((f) => f.enabled);
	if (maxBattleFilters.length === 0) return;

	for (const filterset of maxBattleFilters) {
		if (filterset.bosses === undefined && !filterset.isActive && !filterset.hasGmax) {
			return filterset;
		}

		if (filterset.isActive && !isMaxBattleActive(station)) continue;

		if (filterset.hasGmax && (station.total_stationed_gmax ?? 0) === 0) continue;

		if (
			filterset.bosses !== undefined &&
			filterset.bosses.find(
				(p) =>
					p.pokemon_id === station.battle_pokemon_id &&
					p.form === station.battle_pokemon_form &&
					(p.bread_mode === undefined || p.bread_mode === station.battle_pokemon_bread_mode)
			)
		) {
			return filterset;
		}

		if (filterset.isActive || filterset.hasGmax) return filterset;
	}
}

export function shouldDisplayStation(
	station: Partial<StationData>,
	stationFilter: FilterStation = getActiveStationFilter()
) {
	if (isCurrentSelectedOverwrite(station.mapId)) return true;

	if (!stationFilter.enabled) return false;
	if (stationFilter.stationPlain.enabled) return true;

	const maxBattleFilters = stationFilter.maxBattle.filters.filter((f) => f.enabled);
	if (maxBattleFilters.length === 0) return true;

	return Boolean(matchMaxBattleFilterset(station, stationFilter));
}
