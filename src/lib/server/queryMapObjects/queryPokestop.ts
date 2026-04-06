import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { FilterPokestop } from "@/lib/features/filters/filters";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { LIMIT_POKESTOP } from "@/lib/constants";
import { queryJoined } from "@/lib/server/db/external/internalQuery";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import { shouldDisplayQuest } from "@/lib/features/filterLogic/pokestop";

const FIELDS_POKESTOP = [
	"pokestop.id",
	"pokestop.lat",
	"pokestop.lon",
	"pokestop.name",
	"pokestop.url",
	"pokestop.description",
	"pokestop.lure_expire_timestamp",
	"pokestop.last_modified_timestamp",
	"pokestop.updated",
	"pokestop.first_seen_timestamp",
	"pokestop.deleted",
	"pokestop.lure_id",
	"pokestop.ar_scan_eligible",
	"pokestop.power_up_level",
	"pokestop.power_up_points",
	"pokestop.power_up_end_timestamp",
	"pokestop.quest_timestamp",
	"pokestop.quest_target",
	"pokestop.quest_rewards",
	"pokestop.quest_title",
	"pokestop.quest_expiry",
	"pokestop.alternative_quest_timestamp",
	"pokestop.alternative_quest_target",
	"pokestop.alternative_quest_rewards",
	"pokestop.alternative_quest_title",
	"pokestop.alternative_quest_expiry",
	"pokestop.showcase_pokemon_id",
	"pokestop.showcase_pokemon_form_id",
	"pokestop.showcase_focus",
	"pokestop.showcase_pokemon_type_id",
	"pokestop.showcase_ranking_standard",
	"pokestop.showcase_expiry",
	"pokestop.showcase_rankings",
	"incident.id",
	"incident.pokestop_id",
	"incident.expiration",
	"incident.display_type",
	"incident.character",
	"incident.confirmed",
	"incident.slot_1_pokemon_id",
	"incident.slot_1_form",
	"incident.slot_2_pokemon_id",
	"incident.slot_2_form",
	"incident.slot_3_pokemon_id",
	"incident.slot_3_form"
];

export class PokestopQuery extends DbMapObjectQuery<PokestopData, FilterPokestop> {
	protected readonly type = MapObjectType.POKESTOP;
	protected readonly table = "pokestop";
	protected readonly fields = FIELDS_POKESTOP;
	protected readonly limit = LIMIT_POKESTOP;
	protected readonly idColumn = "pokestop.id";

	protected get pointExpr(): string {
		return "Point(pokestop.lon, pokestop.lat)";
	}

	protected get joins(): string {
		return "LEFT JOIN incident ON incident.pokestop_id = pokestop.id";
	}

	protected get extraWhere(): string[] {
		return ["deleted = 0"];
	}

	protected async executeQuery<T>(sql: string, values: unknown[]): Promise<T> {
		return await queryJoined<T>(sql, values);
	}

	filter(
		data: MinMapObject<PokestopData>,
		_filter: FilterPokestop | undefined,
		polygon: PermittedPolygon
	): boolean {
		shouldDisplayQuest()
		return true;
	}

	prepare(data: MinMapObject<PokestopData>): void {
		if (data.showcase_focus && (data.showcase_expiry ?? 0) > currentTimestamp()) {
			data.contest_focus = JSON.parse(data.showcase_focus);

			if (data.contest_focus?.type === "pokemon") {
				data.contest_focus.pokemon_form = getNormalizedForm(
					data.contest_focus.pokemon_id,
					data.contest_focus.pokemon_form
				);
			}
		}

		data.showcase_pokemon_form_id = getNormalizedForm(
			data.showcase_pokemon_id,
			data.showcase_pokemon_form_id
		);

		for (const incident of data.incident) {
			if (!incident || !incident.id) continue;
			incident.slot_1_form = getNormalizedForm(incident.slot_1_pokemon_id, incident.slot_1_form);
			incident.slot_2_form = getNormalizedForm(incident.slot_2_pokemon_id, incident.slot_2_form);
			incident.slot_3_form = getNormalizedForm(incident.slot_3_pokemon_id, incident.slot_3_form);
		}
	}
}
