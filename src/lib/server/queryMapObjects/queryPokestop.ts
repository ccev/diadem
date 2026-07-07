import {
	shouldDisplayIncident,
	shouldDisplayLure,
	shouldDisplayQuest
} from "@/lib/features/filterLogic/pokestop";
import type { FilterPokestop } from "@/lib/features/filters/filters";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { queryJoined } from "@/lib/server/db/external/internalQuery";
import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { FeaturePermissionContext, PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { ContestRankings, Incident, PokestopData } from "@/lib/types/mapObjectData/pokestop";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { Features } from "@/lib/utils/features";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import {
	INCIDENT_DISPLAY_CONTEST,
	INCIDENT_DISPLAY_GOLD,
	INCIDENT_DISPLAY_KECLEON,
	INCIDENT_DISPLAYS_INVASION,
	isIncidentContest,
	isIncidentGold,
	isIncidentInvasion,
	isIncidentKecleon,
	parseQuestReward,
	stripContestFields,
	stripLureFields,
	stripQuestFields
} from "@/lib/utils/pokestopUtils";

const FIELDS_POKESTOP = [
	"pokestop.id",
	"pokestop.lat",
	"pokestop.lon",
	"pokestop.name",
	"pokestop.url",
	"pokestop.description",
	"pokestop.sponsor_id",
	"pokestop.partner_id",
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

	protected getFilterWhere(filter: FilterPokestop | undefined): { sql: string; values: unknown[] } {
		if (!filter?.enabled || filter.pokestopPlain.enabled) return { sql: "", values: [] };

		const clauses: string[] = [];
		const values: unknown[] = [];
		const activeQuest =
			"((pokestop.quest_target IS NOT NULL AND pokestop.quest_rewards IS NOT NULL) OR (pokestop.alternative_quest_target IS NOT NULL AND pokestop.alternative_quest_rewards IS NOT NULL))";

		if (filter.lure.enabled) {
			const lureFilters = filter.lure.filters.filter((f) => f.enabled);
			const lureItems = lureFilters.flatMap((f) => f.items);
			const lureClauses = ["pokestop.lure_expire_timestamp > UNIX_TIMESTAMP()"];

			if (lureFilters.length > 0 && lureItems.length > 0) {
				lureClauses.push(`pokestop.lure_id IN (${lureItems.map(() => "?").join(",")})`);
				values.push(...lureItems);
			}

			clauses.push(`(${lureClauses.join(" AND ")})`);
		}

		if (filter.quest.enabled) {
			const questFilters = filter.quest.filters.filter((f) => f.enabled);
			const questClauses: string[] = [];

			for (const filterset of questFilters) {
				if (!filterset.tasks?.length) {
					questClauses.push(activeQuest);
					continue;
				}

				for (const task of filterset.tasks) {
					questClauses.push(
						"((pokestop.quest_title = ? AND pokestop.quest_target = ?) OR (pokestop.alternative_quest_title = ? AND pokestop.alternative_quest_target = ?))"
					);
					values.push(task.title, task.target, task.title, task.target);
				}
			}

			clauses.push(questClauses.length ? `(${questClauses.join(" OR ")})` : activeQuest);
		}

		if (filter.invasion.enabled) {
			const invasionFilters = filter.invasion.filters.filter((f) => f.enabled);
			const characterIds = invasionFilters.flatMap((f) => f.characters ?? []);
			const hasUnsafeInvasionFilter = invasionFilters.some((f) => f.rewards?.length);
			const invasionDisplaySql = `incident.display_type IN (${INCIDENT_DISPLAYS_INVASION.map(() => "?").join(",")})`;
			values.push(...INCIDENT_DISPLAYS_INVASION);

			if (invasionFilters.length > 0 && characterIds.length > 0 && !hasUnsafeInvasionFilter) {
				clauses.push(
					`(incident.expiration > UNIX_TIMESTAMP() AND ${invasionDisplaySql} AND incident.character IN (${characterIds.map(() => "?").join(",")}))`
				);
				values.push(...characterIds);
			} else {
				clauses.push(`(incident.expiration > UNIX_TIMESTAMP() AND ${invasionDisplaySql})`);
			}
		}

		if (filter.goldPokestop.enabled) {
			clauses.push("(incident.expiration > UNIX_TIMESTAMP() AND incident.display_type = ?)");
			values.push(INCIDENT_DISPLAY_GOLD);
		}

		if (filter.kecleon.enabled) {
			clauses.push("(incident.expiration > UNIX_TIMESTAMP() AND incident.display_type = ?)");
			values.push(INCIDENT_DISPLAY_KECLEON);
		}

		if (filter.contest.enabled) {
			const contestFilters = filter.contest.filters.filter((f) => f.enabled);
			const contestClauses: string[] = [];
			const contestValues: unknown[] = [];

			for (const filterset of contestFilters) {
				const contestFilterClauses = ["pokestop.showcase_expiry > UNIX_TIMESTAMP()"];

				if (filterset.rankingStandard) {
					contestFilterClauses.push("pokestop.showcase_ranking_standard = ?");
					contestValues.push(filterset.rankingStandard);
				}

				if (filterset.focus.pokemon_id) {
					contestFilterClauses.push("pokestop.showcase_pokemon_id = ?");
					contestValues.push(filterset.focus.pokemon_id);
				}

				if (filterset.focus.form) {
					contestFilterClauses.push("pokestop.showcase_pokemon_form_id = ?");
					contestValues.push(filterset.focus.form);
				}

				if (filterset.focus.type_id) {
					contestFilterClauses.push("pokestop.showcase_pokemon_type_id = ?");
					contestValues.push(filterset.focus.type_id);
				}

				contestClauses.push(`(${contestFilterClauses.join(" AND ")})`);
			}

			clauses.push(
				`(incident.expiration > UNIX_TIMESTAMP() AND incident.display_type = ? AND ${contestClauses.length ? `(${contestClauses.join(" OR ")})` : "pokestop.showcase_expiry > UNIX_TIMESTAMP()"})`
			);
			values.push(INCIDENT_DISPLAY_CONTEST, ...contestValues);
		}

		if (!clauses.length) return { sql: "1 = 0", values: [] };
		return { sql: `(${clauses.join(" OR ")})`, values };
	}

	protected async executeQuery<T>(sql: string, values: unknown[]): Promise<T> {
		return await queryJoined<T>(sql, values);
	}

	filter(
		data: MinMapObject<PokestopData>,
		filter: FilterPokestop,
		polygon: PermittedPolygon,
		context?: FeaturePermissionContext
	): boolean {
		const plainPermitted = !context || context.isAllowedAt(Features.POKESTOP, data.lat, data.lon);

		let showThis = Boolean(
			(plainPermitted && filter.pokestopPlain.enabled) || shouldDisplayLure(data, filter)
		);

		if (!showThis && filter.quest.enabled) {
			for (const quest of data.quests) {
				if (shouldDisplayQuest(quest, { mapId: "" }, filter)) {
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

	private stripUnpermitted(
		data: MinMapObject<PokestopData>,
		context: FeaturePermissionContext
	): void {
		const at = (feature: Parameters<FeaturePermissionContext["isAllowedAt"]>[0]) =>
			context.isAllowedAt(feature, data.lat, data.lon);

		if (!at(Features.QUEST)) stripQuestFields(data);
		if (!at(Features.LURE)) stripLureFields(data);
		if (!at(Features.CONTEST)) stripContestFields(data);

		data.incident = (data.incident ?? []).filter((incident: Incident) => {
			if (isIncidentInvasion(incident)) return at(Features.INVASION);
			if (isIncidentKecleon(incident)) return at(Features.KECLEON);
			if (isIncidentGold(incident)) return at(Features.GOLDEN_POKESTOP);
			if (isIncidentContest(incident)) return at(Features.CONTEST);
			return false;
		});
	}

	prepare(data: MinMapObject<PokestopData>, context?: FeaturePermissionContext): void {
		data.quests = [];
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

		if (data.showcase_focus && (data.showcase_expiry ?? 0) > currentTimestamp()) {
			data.contest_focus = JSON.parse(data.showcase_focus);

			data.contest_rankings = {
				total_entries: 0,
				last_update: 0,
				contest_entries: []
			};

			if (data.showcase_rankings) {
				data.contest_rankings = (JSON.parse(data.showcase_rankings) ||
					data.contest_rankings) as ContestRankings;
				data.contest_rankings.total_entries = data.contest_rankings.total_entries || 0;
				data.contest_rankings.last_update = data.contest_rankings.last_update || 0;

				data.contest_rankings.contest_entries = (data.contest_rankings.contest_entries ?? []).map(
					(e) => {
						return {
							...e,
							form: getNormalizedForm(e.pokemon_id, e.form)
						};
					}
				);
			}

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

		if (context) this.stripUnpermitted(data, context);
	}
}
