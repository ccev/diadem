import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { FilterPokestop } from "@/lib/features/filters/filters";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { queryJoined } from "@/lib/server/db/external/internalQuery";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { makePointFeatureChecker, type PointFeatureChecker } from "@/lib/services/user/checkPerm";
import { POKESTOP_SUB_FEATURES } from "@/lib/permissions/subFeatures";
import {
	shouldDisplayIncident,
	shouldDisplayLure,
	shouldDisplayQuest
} from "@/lib/features/filterLogic/pokestop";
import { parseQuestReward } from "@/lib/utils/pokestopUtils";
import { Features, type Perms } from "@/lib/utils/features";
import type { Incident } from "@/lib/types/mapObjectData/pokestop";
import { getLogger, throttledLog } from "@/lib/utils/logger";

const log = getLogger("query.pokestop");
const UNKNOWN_INCIDENT_WARN_INTERVAL_MS = 5 * 60 * 1000;

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

	filter(data: MinMapObject<PokestopData>, filter: FilterPokestop, perms?: Perms): boolean {
		const has = makePointFeatureChecker(perms, data.lat, data.lon);

		let showThis = Boolean(
			(filter.pokestopPlain.enabled && has(Features.POKESTOP)) ||
				(has(Features.LURE) && shouldDisplayLure(data, filter))
		);

		if (!showThis && filter.quest.enabled && has(Features.QUEST)) {
			for (const quest of data.quests) {
				if (shouldDisplayQuest(quest, { mapId: undefined }, filter)) {
					showThis = true;
					break;
				}
			}
		}

		if (!showThis) {
			for (const incident of data?.incident ?? []) {
				if (!isIncidentAllowed(incident, has)) continue;
				if (shouldDisplayIncident(incident, data, filter)) {
					showThis = true;
					break;
				}
			}
		}

		return showThis;
	}

	prepare(data: MinMapObject<PokestopData>, perms?: Perms): void {
		const has = makePointFeatureChecker(perms, data.lat, data.lon);
		const allowQuest = has(Features.QUEST);
		const allowShowcase = has(Features.SHOWCASE);

		// Build the structured `quests` array only when the user can see them.
		// Otherwise the registry's QUEST scrub clears the raw fields below
		// and `quests` stays an empty list — no point parsing first.
		data.quests = [];
		if (allowQuest) {
			if (data.alternative_quest_target && data.alternative_quest_rewards) {
				const reward = parseQuestReward(data.alternative_quest_rewards);
				if (reward)
					data.quests.push({
						reward,
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
						title: data.quest_title ?? "",
						target: data.quest_target ?? 0,
						timestamp: data.quest_timestamp ?? 0,
						expires: data.quest_expiry ?? 0
					});
			}
		}

		if (allowShowcase) {
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
		}

		for (const incident of data.incident) {
			if (!incident || !incident.id) continue;
			incident.slot_1_form = getNormalizedForm(incident.slot_1_pokemon_id, incident.slot_1_form);
			incident.slot_2_form = getNormalizedForm(incident.slot_2_pokemon_id, incident.slot_2_form);
			incident.slot_3_form = getNormalizedForm(incident.slot_3_pokemon_id, incident.slot_3_form);
		}

		if (!perms) return;

		// Apply registry-driven scrubbing. Each sub-feature lists the raw
		// fields it owns and (optionally) an `onScrub` callback; both run
		// when the user lacks the feature at this row's coords.
		for (const sub of POKESTOP_SUB_FEATURES) {
			if (has(sub.feature)) continue;
			for (const field of sub.fields ?? []) {
				(data as Record<string, unknown>)[field as string] = undefined;
			}
			sub.onScrub?.(data);
		}

		if (Array.isArray(data.incident) && data.incident.length > 0) {
			data.incident = data.incident.filter((incident) => {
				if (!incident || !incident.id) return false;
				return isIncidentAllowed(incident, has);
			});
		}
	}
}

// Decides whether an incident row passes the user's per-feature perms.
// Known display_types are gated by their matching sub-feature; unknown
// types fall through (forwards-compatible with new Niantic incidents),
// but we emit a throttled warning so the perms model can be extended.
function isIncidentAllowed(incident: Incident, has: PointFeatureChecker): boolean {
	for (const sub of POKESTOP_SUB_FEATURES) {
		if (sub.incidentMatcher?.(incident)) {
			return has(sub.feature);
		}
	}
	throttledLog(
		log,
		"warning",
		`pokestop.unknown-incident.${incident.display_type}`,
		UNKNOWN_INCIDENT_WARN_INTERVAL_MS,
		"Encountered incident with display_type=%d not covered by any sub-feature; allowing through. Add a sub-feature for it in subFeatures.ts to gate it.",
		incident.display_type
	);
	return true;
}
