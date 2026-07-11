import { shouldDisplayRaid } from "@/lib/features/filterLogic/gym";
import type { FilterGym } from "@/lib/features/filters/filters";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { FeaturePermissionContext, PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { GymData, GymDefender } from "@/lib/types/mapObjectData/gym";
import { Features } from "@/lib/utils/features";
import { stripRaidFields } from "@/lib/utils/gymUtils";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";

export class GymQuery extends DbMapObjectQuery<GymData, FilterGym> {
	protected readonly type = MapObjectType.GYM;
	protected readonly table = "gym";
	protected readonly fields = [
		"id",
		"lat",
		"lon",
		"name",
		"url",
		"description",
		"sponsor_id",
		"partner_id",
		"last_modified_timestamp",
		"updated",
		"first_seen_timestamp",
		"raid_end_timestamp",
		"raid_spawn_timestamp",
		"raid_battle_timestamp",
		"raid_pokemon_id",
		"raid_pokemon_form",
		"raid_pokemon_cp",
		"raid_pokemon_move_1",
		"raid_pokemon_move_2",
		"raid_pokemon_gender",
		"raid_pokemon_costume",
		"raid_pokemon_evolution",
		"raid_pokemon_alignment",
		"raid_level",
		"team_id",
		"availble_slots",
		"in_battle",
		"ex_raid_eligible",
		"defenders AS defenders_raw",
		"rsvps AS raw_rsvps",
		"deleted"
	];
	protected readonly limit = requestLimits[MapObjectType.GYM];
	protected readonly idColumn = "gym.id";

	protected readonly extraWhere = ["deleted = 0"];

	protected getFilterWhere(filter: FilterGym | undefined): { sql: string; values: unknown[] } {
		if (filter && !filter.gymPlain.enabled && filter.raid.enabled) {
			const filters = filter.raid.filters.filter((f) => f.enabled);
			const clauses: string[] = [];
			const values: unknown[] = [];

			for (const filterset of filters) {
				if (filterset.show?.includes("egg")) clauses.push("COALESCE(raid_pokemon_id, 0) = 0");
				if (filterset.show?.includes("boss")) clauses.push("COALESCE(raid_pokemon_id, 0) != 0");

				if (filterset.levels?.length) {
					clauses.push(`raid_level IN (${filterset.levels.map(() => "?").join(",")})`);
					values.push(...filterset.levels);
				}

				for (const boss of filterset.bosses ?? []) {
					const bossClauses = ["raid_pokemon_id = ?"];
					values.push(boss.pokemon_id);

					if (boss.temp_evolution_id !== undefined) {
						bossClauses.push("raid_pokemon_evolution = ?");
						values.push(boss.temp_evolution_id);
					}

					clauses.push(`(${bossClauses.join(" AND ")})`);
				}
			}

			const sql = ["raid_end_timestamp > UNIX_TIMESTAMP()"];
			if (clauses.length) sql.push(`(${clauses.join(" OR ")})`);

			return { sql: sql.join(" AND "), values };
		}
		return { sql: "", values: [] };
	}

	filter(
		data: MinMapObject<GymData>,
		filter: FilterGym,
		polygon: PermittedPolygon,
		context?: FeaturePermissionContext
	): boolean {
		const plainPermitted = !context || context.isAllowedAt(Features.GYM, data.lat, data.lon);
		return Boolean((plainPermitted && filter.gymPlain.enabled) || shouldDisplayRaid(data, filter));
	}

	prepare(data: MinMapObject<GymData>, context?: FeaturePermissionContext): void {
		if (context && !context.isAllowedAt(Features.RAID, data.lat, data.lon)) {
			stripRaidFields(data);
		}

		data.raid_pokemon_form = getNormalizedForm(data.raid_pokemon_id, data.raid_pokemon_form);

		if (data.defenders_raw) {
			data.defenders = JSON.parse(data.defenders_raw) as GymDefender[];
			for (const defender of data?.defenders ?? []) {
				defender.form = getNormalizedForm(defender.pokemon_id, defender.form);
			}
			delete data.defenders_raw;
		}

		if (data.raw_rsvps) {
			data.rsvps = JSON.parse(data.raw_rsvps || "[]") || [];
			delete data.raw_rsvps;
		}
	}
}
