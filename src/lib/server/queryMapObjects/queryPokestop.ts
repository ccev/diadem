import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { FilterPokestop } from "@/lib/features/filters/filters";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { queryJoined } from "@/lib/server/db/external/internalQuery";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import {
	shouldDisplayIncident,
	shouldDisplayLure,
	shouldDisplayQuest
} from "@/lib/features/filterLogic/pokestop";
import { hasFortActiveLure, parseQuestReward } from "@/lib/utils/pokestopUtils";

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
	protected readonly limit = requestLimits[MapObjectType.POKESTOP];
	protected readonly idColumn = "pokestop.id";
	protected readonly updatedColumn = "pokestop.updated";
	protected readonly pointExpr = "Point(pokestop.lon, pokestop.lat)";
	protected readonly joins = "LEFT JOIN incident ON incident.pokestop_id = pokestop.id";
	protected readonly extraWhere = ["deleted = 0"];

	protected async executeQuery<T>(sql: string, values: unknown[]): Promise<T> {
		return await queryJoined<T>(sql, values);
	}

	filter(
		data: MinMapObject<PokestopData>,
		filter: FilterPokestop,
		polygon: PermittedPolygon
	): boolean {
		let showThis = Boolean(filter.pokestopPlain.enabled || shouldDisplayLure(data, filter));

		if (!showThis && filter.quest.enabled) {
			for (const quest of data.quests) {
				if (shouldDisplayQuest(quest, { mapId: undefined }, filter)) {
					showThis = true;
					break;
				}
			}
		}

		if (!showThis) {
			for (const incident of data?.incident ?? []) {
				if (shouldDisplayIncident(incident, data, filter)) {
					showThis = true;
					break;
				}
			}
		}

		return showThis;
	}

	prepare(data: MinMapObject<PokestopData>): void {
		data.quests = [];
		if (data.alternative_quest_target && data.alternative_quest_rewards) {
			const reward = parseQuestReward(data.alternative_quest_rewards);
			if (reward)
				data.quests.push({
					reward,
					isAr: false,
					title: data.alternative_quest_title ?? "",
					target: data.alternative_quest_target ?? 0,
					timestamp: data.alternative_quest_timestamp ?? 0,
					expires: data.alternative_quest_expiry ?? 0
				});
		}
		if (data.quest_target && data.quest_rewards) {
			const reward = parseQuestReward(data.quest_rewards);
			if (reward)
				data.quests.push({
					reward,
					isAr: true,
					title: data.quest_title ?? "",
					target: data.quest_target ?? 0,
					timestamp: data.quest_timestamp ?? 0,
					expires: data.quest_expiry ?? 0
				});
		}

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
