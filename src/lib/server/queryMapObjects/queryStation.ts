import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { StationData } from "@/lib/types/mapObjectData/station";
import type { FilterStation } from "@/lib/features/filters/filters";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import { shouldDisplayStation } from "@/lib/features/filterLogic/station";

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
		"stationed_pokemon"
	];
	protected readonly limit = requestLimits[MapObjectType.STATION];
	protected readonly idColumn = "station.id";

	protected readonly extraWhere = ["end_time > UNIX_TIMESTAMP()"];

	filter(
		data: MinMapObject<StationData>,
		filter: FilterStation,
		polygon: PermittedPolygon
	): boolean {
		return shouldDisplayStation(data, filter);
	}

	prepare(data: MinMapObject<StationData>): void {
		data.battle_pokemon_form = getNormalizedForm(data.battle_pokemon_id, data.battle_pokemon_form);
	}
}
