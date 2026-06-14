import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { StationData } from "@/lib/types/mapObjectData/station";
import type { FilterStation } from "@/lib/features/filters/filters";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import { makePointFeatureChecker } from "@/lib/services/user/checkPerm";
import { STATION_SUB_FEATURES } from "@/lib/permissions/subFeatures";
import { shouldDisplayStation } from "@/lib/features/filterLogic/station";
import { type Perms } from "@/lib/utils/features";
import { isMaxBattleActive, stripMaxBattleFields } from "@/lib/utils/stationUtils";

export class StationQuery extends DbMapObjectQuery<StationData, FilterStation> {
	protected readonly type = MapObjectType.STATION;
	protected readonly table = "station";
	protected readonly fields = [
		"id",
		"lat",
		"lon",
		"name",
		"start_time",
		"end_time",
		"is_battle_available",
		"is_inactive",
		"battle_level",
		"battle_pokemon_id",
		"battle_pokemon_form",
		"battle_pokemon_costume",
		"battle_pokemon_gender",
		"battle_pokemon_alignment",
		"battle_pokemon_bread_mode",
		"battle_pokemon_move_1",
		"battle_pokemon_move_2",
		"updated",
		"total_stationed_pokemon",
		"total_stationed_gmax",
		"stationed_pokemon",
		"battle_pokemon_stamina",
		"battle_pokemon_cp_multiplier"
	];
	protected readonly limit = requestLimits[MapObjectType.STATION];
	protected readonly idColumn = "station.id";

	protected getFilterWhere(filter: FilterStation | undefined): { sql: string; values: unknown[] } {
		if (filter && !filter.stationPlain.enabled && filter.maxBattle.enabled) {
			return { sql: "end_time > UNIX_TIMESTAMP()", values: [] };
		}
		return { sql: "", values: [] };
	}

	filter(data: MinMapObject<StationData>, filter: FilterStation, perms?: Perms): boolean {
		if (!perms) return shouldDisplayStation(data, filter);
		const has = makePointFeatureChecker(perms, data.lat, data.lon);
		return shouldDisplayStation(data, filter, has);
	}

	prepare(data: MinMapObject<StationData>, perms?: Perms): void {
		data.battle_pokemon_form = getNormalizedForm(data.battle_pokemon_id, data.battle_pokemon_form);

		if (!isMaxBattleActive(data)) stripMaxBattleFields(data);

		if (!perms) return;

		const has = makePointFeatureChecker(perms, data.lat, data.lon);

		for (const sub of STATION_SUB_FEATURES) {
			if (has(sub.feature)) continue;
			for (const field of sub.fields ?? []) {
				(data as Record<string, unknown>)[field as string] = undefined;
			}
			sub.onScrub?.(data);
		}
	}
}
