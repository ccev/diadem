import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { GymData, GymDefender } from "@/lib/types/mapObjectData/gym";
import type { FilterGym } from "@/lib/features/filters/filters";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import { hasFeatureAnywhere, makePointFeatureChecker } from "@/lib/services/user/checkPerm";
import { GYM_SUB_FEATURES } from "@/lib/permissions/subFeatures";
import { shouldDisplayRaid } from "@/lib/features/filterLogic/gym";
import { Features, type Perms } from "@/lib/utils/features";

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
		"rsvps",
		"deleted"
	];
	protected readonly limit = requestLimits[MapObjectType.GYM];
	protected readonly idColumn = "gym.id";

	protected readonly extraWhere = ["deleted = 0"];

	// Narrow SQL to active raids when the row would never pass the in-app
	// filter anyway: either the user filter excludes plain gyms while raids
	// are on, or the user lacks GYM perm everywhere but holds RAID. The
	// in-app filter still enforces perms per-row, so this is purely an
	// upstream optimization.
	protected getFilterWhere(
		filter: FilterGym | undefined,
		perms?: Perms
	): { sql: string; values: unknown[] } {
		const filterExcludesPlain = !!filter && !filter.gymPlain.enabled && filter.raid.enabled;
		const permsExcludePlain =
			!!perms &&
			!hasFeatureAnywhere(perms, Features.GYM) &&
			hasFeatureAnywhere(perms, Features.RAID);

		if (filterExcludesPlain || permsExcludePlain) {
			return { sql: "raid_end_timestamp > UNIX_TIMESTAMP()", values: [] };
		}
		return { sql: "", values: [] };
	}

	filter(data: MinMapObject<GymData>, filter: FilterGym, perms?: Perms): boolean {
		const has = makePointFeatureChecker(perms, data.lat, data.lon);

		return Boolean(
			(filter.gymPlain.enabled && has(Features.GYM)) ||
				(has(Features.RAID) && shouldDisplayRaid(data, filter))
		);
	}

	prepare(data: MinMapObject<GymData>, perms?: Perms): void {
		data.raid_pokemon_form = getNormalizedForm(data.raid_pokemon_id, data.raid_pokemon_form);

		if (data.defenders_raw) {
			data.defenders = JSON.parse(data.defenders_raw) as GymDefender[];
			for (const defender of data?.defenders ?? []) {
				defender.form = getNormalizedForm(defender.pokemon_id, defender.form);
			}
		}

		if (!perms) return;

		const has = makePointFeatureChecker(perms, data.lat, data.lon);

		for (const sub of GYM_SUB_FEATURES) {
			if (has(sub.feature)) continue;
			for (const field of sub.fields ?? []) {
				(data as Record<string, unknown>)[field as string] = undefined;
			}
			sub.onScrub?.(data);
		}
	}
}
