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
	RewardType,
	stripContestFields,
	stripLureFields,
	stripQuestFields
} from "@/lib/utils/pokestopUtils";
import { getConfirmedInvasionReward } from "$lib/server/queryMapObjects/invasionRewards";
import { getActiveCharacters } from "$lib/features/masterStats.svelte";

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
	"pokestop.quest_template",
	"pokestop.alternative_quest_timestamp",
	"pokestop.alternative_quest_target",
	"pokestop.alternative_quest_rewards",
	"pokestop.alternative_quest_title",
	"pokestop.alternative_quest_expiry",
	"pokestop.alternative_quest_template",
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
			const getQuestRewardWhere = (filterset: (typeof questFilters)[number], prefix: string) => {
				const rewardClauses: string[] = [];
				const rewardValues: unknown[] = [];
				const typeColumn = `${prefix}quest_reward_type`;
				const amountColumn = `${prefix}quest_reward_amount`;
				const itemColumn = `${prefix}quest_item_id`;
				const pokemonColumn = `${prefix}quest_pokemon_id`;

				const addAmountReward = (type: RewardType, range: { min: number; max: number }) => {
					const amountClauses = [`${typeColumn} = ?`];
					const amountValues: unknown[] = [type];

					if (Number.isFinite(range.min)) {
						amountClauses.push(`${amountColumn} >= ?`);
						amountValues.push(range.min);
					}
					if (Number.isFinite(range.max)) {
						amountClauses.push(`${amountColumn} <= ?`);
						amountValues.push(range.max);
					}

					rewardClauses.push(`(${amountClauses.join(" AND ")})`);
					rewardValues.push(...amountValues);
				};

				if (filterset.stardust) addAmountReward(RewardType.STARDUST, filterset.stardust);
				if (filterset.pokecoins) addAmountReward(RewardType.POKECOINS, filterset.pokecoins);
				if (filterset.xp) addAmountReward(RewardType.XP, filterset.xp);

				if (filterset.pokemon?.length) {
					rewardClauses.push(
						`(${typeColumn} = ? AND ${pokemonColumn} IN (${filterset.pokemon.map(() => "?").join(",")}))`
					);
					rewardValues.push(
						RewardType.POKEMON,
						...filterset.pokemon.map((pokemon) => pokemon.pokemon_id)
					);
				}

				for (const item of filterset.item ?? []) {
					const itemClauses = [`${typeColumn} = ?`, `${itemColumn} = ?`];
					const itemValues: unknown[] = [RewardType.ITEM, item.id];
					if (item.amount !== undefined) {
						itemClauses.push(`${amountColumn} = ?`);
						itemValues.push(item.amount);
					}
					rewardClauses.push(`(${itemClauses.join(" AND ")})`);
					rewardValues.push(...itemValues);
				}

				for (const reward of filterset.megaResource ?? []) {
					const rewardClausesForType = [
						`${typeColumn} IN (?, ?)`,
						`${pokemonColumn} = ?`
					];
					const rewardValuesForType: unknown[] = [
						RewardType.MEGA_ENERGY,
						RewardType.TEMP_EVO_BRANCH_RESOURCE,
						reward.id
					];
					if (reward.amount !== undefined) {
						rewardClausesForType.push(`${amountColumn} = ?`);
						rewardValuesForType.push(reward.amount);
					}
					rewardClauses.push(`(${rewardClausesForType.join(" AND ")})`);
					rewardValues.push(...rewardValuesForType);
				}

				for (const reward of filterset.candy ?? []) {
					const rewardClausesForType = [`${typeColumn} = ?`, `${pokemonColumn} = ?`];
					const rewardValuesForType: unknown[] = [RewardType.CANDY, reward.id];
					if (reward.amount !== undefined) {
						rewardClausesForType.push(`${amountColumn} = ?`);
						rewardValuesForType.push(reward.amount);
					}
					rewardClauses.push(`(${rewardClausesForType.join(" AND ")})`);
					rewardValues.push(...rewardValuesForType);
				}

				for (const reward of filterset.xlCandy ?? []) {
					const rewardClausesForType = [`${typeColumn} = ?`, `${pokemonColumn} = ?`];
					const rewardValuesForType: unknown[] = [RewardType.XL_CANDY, reward.id];
					if (reward.amount !== undefined) {
						rewardClausesForType.push(`${amountColumn} = ?`);
						rewardValuesForType.push(reward.amount);
					}
					rewardClauses.push(`(${rewardClausesForType.join(" AND ")})`);
					rewardValues.push(...rewardValuesForType);
				}

				return { sql: rewardClauses.join(" OR "), values: rewardValues };
			};

			for (const filterset of questFilters) {
				for (const prefix of ["pokestop.", "pokestop.alternative_"]) {
					const filtersetClauses: string[] = [];
					const filtersetValues: unknown[] = [];

					if (filterset.tasks?.length) {
						filtersetClauses.push(
							`(${filterset.tasks
								.map(() => `(${prefix}quest_title = ? AND ${prefix}quest_target = ?)`)
								.join(" OR ")})`
						);
						for (const task of filterset.tasks) {
							filtersetValues.push(task.title, task.target);
						}
					} else {
						filtersetClauses.push(
							`${prefix}quest_target IS NOT NULL AND ${prefix}quest_rewards IS NOT NULL`
						);
					}

					const rewardWhere = getQuestRewardWhere(filterset, prefix);
					if (rewardWhere.sql) {
						filtersetClauses.push(`(${rewardWhere.sql})`);
						filtersetValues.push(...rewardWhere.values);
					}

					questClauses.push(`(${filtersetClauses.join(" AND ")})`);
					values.push(...filtersetValues);
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
					expires: data.alternative_quest_expiry ?? 0,
					template: data.alternative_quest_template ?? ""
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
					expires: data.quest_expiry ?? 0,
					template: data.quest_template ?? ""
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
			incident.confirmed_reward = getConfirmedInvasionReward(
				incident,
				getActiveCharacters()
			);
		}

		if (context) this.stripUnpermitted(data, context);
	}
}
