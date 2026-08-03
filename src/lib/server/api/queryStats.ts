import { isFortApiEnabled, getCachedFortAvailability } from "@/lib/server/api/golbatFortApi";
import { query } from "@/lib/server/db/external/internalQuery";
import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import type { FortAvailability } from "@/lib/server/queryMapObjects/queries";
import { getMasterPokemon } from "@/lib/services/masterfile";
import type {
	ContestFocus,
	ContestFocusPokemon,
	ContestFocusType,
	QuestReward,
	QuestRewardTempEvoBranch
} from "@/lib/types/mapObjectData/pokestop";
import { getLogger } from "@/lib/utils/logger";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import { getQuestKey, parseQuestReward, RewardType } from "@/lib/utils/pokestopUtils";

const log = getLogger("masterstats");
const scrapedDuckUrl = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/";

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status} ${await response.text()}`);
	}

	return (await response.json()) as T;
}

type AllShinyStatsRow = {
	pokemon_id: number;
	form: number;
	shinies: string;
	total: string;
	days: number;
};

type AllSpawnStatsRow = {
	pokemon_id: number;
	form: number;
	count: string;
	total_spawns: string;
	days: number;
};

type QuestStatsRow = {
	quest_rewards: string;
	quest_title: string;
	quest_target: number;
	count: number;
};

type ContestStatsRow = {
	ranking_standard: number;
	focus: string;
	count: number;
};

type MaxBattleStatsRow = {
	level: number;
	pokemon_id: number;
	form: number;
	bread_mode: number;
	count: number;
};

type NestStatsRow = {
	pokemon_id: number;
	form: number;
	count: number;
};

type RaidStatsRow = {
	level: number;
	pokemon_id: number;
	form: number;
	temp_evolution_id: number;
	count: number;
};

export type ActiveRaidStats = {
	level: number;
	pokemon_id: number;
	form: number;
	temp_evolution_id: number;
	count?: number;
};

type InvasionStatsRow = {
	character: number;
	count: number;
};

export type ActiveInvasionCharacterStats = {
	character: number;
	count: number;
	first: InvasionPokemonStats[];
	second: InvasionPokemonStats[];
	third: InvasionPokemonStats[];
};

export type PokemonStatEntry = {
	shiny?: {
		shinies: number;
		total: number;
		days: number;
	};
	spawns?: {
		count: number;
		days: number;
	};
};

export type TotalPokemonStats = {
	count: number;
	days: number;
};

export type QuestStats = {
	[key: string]: {
		reward: QuestReward;
		title: string;
		target: number;
		count: number;
	};
};

export type TotalQuestStats = {
	count: number;
};

export type ContestStatsEntry = {
	ranking_standard: number;
	focus: ContestFocus;
	count?: number;
};

export type MaxBattleStatsEntry = {
	level: number;
	pokemon_id: number;
	form: number;
	bread_mode: number;
	count?: number;
};

export type NestStatsEntry = {
	pokemon_id: number;
	form: number;
	count: number;
};

export type EggStats = {
	pokemon_id: number;
	form: number;
	km: number;
	rarity: number;
	shiny: boolean;
	isAdventureSync: boolean;
	isRegional: boolean;
	isGift: boolean;
};

export type InvasionPokemonStats = {
	pokemon_id: number;
	form: number;
	encounter: boolean;
	shiny: boolean;
};

export type MasterStats = {
	totalPokemon: TotalPokemonStats;
	pokemon: {
		[key: string]: PokemonStatEntry; // key format: "pokemonId-formId"
	};
	totalQuests: TotalQuestStats;
	quests: QuestStats;
	activeRaids: ActiveRaidStats[];
	activeCharacters: ActiveInvasionCharacterStats[];
	activeContests: ContestStatsEntry[];
	activeMaxBattles: MaxBattleStatsEntry[];
	activeNests: NestStatsEntry[];
	activeEggs: EggStats[];
	generatedAt: number;
};

function extractPokemonIdFromLeekduckImage(imageUrl: string): {
	pokemonId: number;
	formId: number;
} {
	try {
		const filename = imageUrl.split("/").pop()?.replace(".icon.png", "") ?? "";
		const match = filename.match(/^pm(\d+)(?:\.f([A-Z_]+))?$/);

		if (!match) throw new Error("Image didn't match pattern");

		const formName = match[2] ?? null;
		const pokemonId = Number(match[1]);
		let formId = 0;

		const masterPokemon = getMasterPokemon(pokemonId);
		if (formName && masterPokemon?.forms) {
			const formNameUpper = formName.toUpperCase();
			for (const [formIdStr, form] of Object.entries(masterPokemon.forms)) {
				if (form.name?.toUpperCase() === formNameUpper) {
					formId = Number(formIdStr);
					break;
				}
			}
		}

		return {
			pokemonId,
			formId
		};
	} catch (e) {
		log.error("Error while parsing leekduck image: %s", e);
		return { pokemonId: 0, formId: 0 };
	}
}

function getInvasionCharacterId(name: string, type: string): number | null {
	const nameLower = name.toLowerCase();

	if (nameLower.includes("giovanni")) return 44;
	if (nameLower.includes("cliff")) return 41;
	if (nameLower.includes("arlo")) return 42;
	if (nameLower.includes("sierra")) return 43;

	if (nameLower.includes("decoy")) {
		if (nameLower.includes("female")) return 46;
		if (nameLower.includes("male")) return 45;
	}

	if (
		nameLower === "female grunt" ||
		(nameLower.includes("female grunt") && !nameLower.includes("type"))
	)
		return 5;

	if (
		nameLower === "male grunt" ||
		(nameLower.includes("male grunt") && !nameLower.includes("type"))
	)
		return 4;

	const typeToBaseId: { [key: string]: { female: number; male: number } } = {
		bug: { female: 6, male: 7 },
		dark: { female: 10, male: 11 },
		dragon: { female: 12, male: 13 },
		fairy: { female: 14, male: 15 },
		fighting: { female: 16, male: 17 },
		fire: { female: 18, male: 19 },
		flying: { female: 20, male: 21 },
		grass: { female: 22, male: 23 },
		ground: { female: 24, male: 25 },
		ice: { female: 26, male: 27 },
		steel: { female: 28, male: 29 },
		metal: { female: 28, male: 29 },
		normal: { female: 30, male: 31 },
		poison: { female: 32, male: 33 },
		psychic: { female: 34, male: 35 },
		rock: { female: 36, male: 37 },
		water: { female: 38, male: 39 },
		ghost: { female: 47, male: 48 },
		electric: { female: 49, male: 50 }
	};

	const typeLower = type.toLowerCase();
	const typeEntry = typeToBaseId[typeLower];
	if (!typeEntry) {
		return null;
	}

	if (nameLower.includes("female")) return typeEntry.female;
	if (nameLower.includes("male")) return typeEntry.male;

	return null;
}

export async function queryMasterStats(): Promise<MasterStats> {
	// TODO: timeframe

	const [
		allShinyStats,
		allSpawnStats,
		allQuestStats,
		allRaidStats,
		allCharacterStats,
		allContestStats,
		allMaxBattlesStats,
		allNestsStats,
		eggsData,
		invasionLineupsData
	] = await Promise.all([
		query<AllShinyStatsRow[]>(
			"SELECT pokemon_id, form_id AS form, SUM(count) as shinies, SUM(total) as total, COUNT(*) as days " +
				"FROM pokemon_shiny_stats " +
				"WHERE fence = 'world' " +
				"GROUP BY pokemon_id, form "
		),
		query<AllSpawnStatsRow[]>(
			"SELECT pokemon_id, form_id AS form, SUM(count) as count, " +
				"(SELECT SUM(count) FROM pokemon_stats WHERE fence = 'world') as total_spawns, " +
				"COUNT(DISTINCT date) as days " +
				"FROM pokemon_stats " +
				"WHERE fence = 'world' " +
				"GROUP BY pokemon_id, form " +
				"HAVING count > 0"
		),
		isFortApiEnabled()
			? Promise.resolve([] as QuestStatsRow[])
			: query<QuestStatsRow[]>(
					"SELECT q.quest_rewards, q.quest_title, q.quest_target, COUNT(*) AS count " +
						"FROM ( " +
						"SELECT quest_rewards, quest_title, quest_target " +
						"FROM pokestop " +
						"WHERE quest_title IS NOT NULL " +
						"UNION ALL " +
						"SELECT alternative_quest_rewards as quest_rewards, alternative_quest_title as quest_title, alternative_quest_target as quest_target " +
						"FROM pokestop " +
						"WHERE alternative_quest_title IS NOT NULL " +
						") q " +
						"GROUP BY q.quest_title, q.quest_rewards, q.quest_target"
				),
		query<RaidStatsRow[]>(
			"SELECT level, pokemon_id, form_id AS form, temp_evo_id AS temp_evolution_id, SUM(count) AS count " +
				"FROM raid_stats " +
				"WHERE date >= CURDATE() - INTERVAL 1 DAY AND area = 'world' " +
				"GROUP BY 1, 2, 3, 4 " +
				"ORDER BY level ASC"
		),
		query<InvasionStatsRow[]>(
			"SELECT `character`, SUM(`count`) AS `count` " +
				"FROM invasion_stats " +
				"WHERE date >= CURDATE() - INTERVAL 1 DAY AND area = 'world' " +
				"GROUP BY 1 " +
				"ORDER BY `character` ASC"
		),
		isFortApiEnabled()
			? Promise.resolve([] as ContestStatsRow[])
			: query<ContestStatsRow[]>(
					"SELECT showcase_ranking_standard AS ranking_standard, showcase_focus AS focus, COUNT(*) as count " +
						"FROM pokestop " +
						"WHERE showcase_ranking_standard IS NOT NULL " +
						"AND showcase_focus IS NOT NULL " +
						"AND showcase_expiry > UNIX_TIMESTAMP() " +
						"GROUP BY 1, 2"
				),
		isFortApiEnabled()
			? Promise.resolve([] as MaxBattleStatsRow[])
			: query<MaxBattleStatsRow[]>(
					"SELECT battle_level AS level, battle_pokemon_id AS pokemon_id, battle_pokemon_form AS form, battle_pokemon_bread_mode AS bread_mode, COUNT(*) as count " +
						"FROM station " +
						"WHERE battle_pokemon_id IS NOT NULL " +
						"AND battle_start > UNIX_TIMESTAMP() - 86400 " +
						"GROUP BY 1, 2, 3, 4"
				),
		query<NestStatsRow[]>(
			"SELECT pokemon_id, pokemon_form AS form, COUNT(*) AS count " +
				"FROM nests " +
				"WHERE pokemon_id IS NOT NULL " +
				"AND updated > UNIX_TIMESTAMP() - 86400 " +
				"GROUP BY 1, 2"
		),
		fetchJson(`${scrapedDuckUrl}eggs.min.json`),
		fetchJson(`${scrapedDuckUrl}rocketLineups.min.json`)
	]);

	await masterfileProvider.get();

	const pokemon: { [key: string]: PokemonStatEntry } = {};
	let pokemonTotal = 0;
	let pokemonTotalDays = 0;

	const quests: QuestStats = {};
	let questsTotal = 0;

	let activeRaids: ActiveRaidStats[] = [];

	const activeContests: ContestStatsEntry[] = [];
	const activeMaxBattles: MaxBattleStatsEntry[] = [];
	const activeNests: NestStatsEntry[] = [];

	for (const row of allShinyStats) {
		const form = getNormalizedForm(row.pokemon_id, row.form);

		const key = `${row.pokemon_id}-${form}`;
		if (!pokemon[key]) {
			pokemon[key] = {};
		}

		const shinies = Number(row.shinies ?? 0);
		const total = Number(row.total ?? 0);

		if (pokemon[key].shiny) {
			pokemon[key].shiny.shinies += shinies;
			pokemon[key].shiny.total += total;
		} else {
			pokemon[key].shiny = {
				shinies,
				total,
				days: row.days ?? 0
			};
		}
	}

	for (const row of allSpawnStats) {
		const form = getNormalizedForm(row.pokemon_id, row.form);

		const key = `${row.pokemon_id}-${form}`;
		if (!pokemon[key]) {
			pokemon[key] = {};
		}

		const thisTotal = Number(row.total_spawns ?? 0);
		if (!pokemonTotal && thisTotal) {
			pokemonTotal = thisTotal;
			pokemonTotalDays = row.days ?? 0;
		}

		const count = Number(row.count ?? 0);
		if (pokemon[key].spawns) {
			pokemon[key].spawns.count += count;
		} else {
			pokemon[key].spawns = {
				count,
				days: row.days ?? 0
			};
		}
	}

	for (const row of allQuestStats) {
		const questReward = parseQuestReward(row.quest_rewards);
		if (!questReward) continue;

		if (questReward.type === RewardType.POKEMON) {
			questReward.info.form = getNormalizedForm(questReward.info.pokemon_id, questReward.info.form);
		}

		const key = getQuestKey(row.quest_rewards, row.quest_title, row.quest_target);
		const count = Number(row.count ?? 0);
		questsTotal += count;

		quests[key] = {
			reward: questReward,
			title: row.quest_title,
			target: row.quest_target,
			count: count
		};
	}

	for (const row of allRaidStats) {
		const form = getNormalizedForm(row.pokemon_id, row.form);
		const count = Number(row.count ?? 0);

		const existingRaid = activeRaids.find(
			(raid) =>
				raid.level === row.level &&
				raid.pokemon_id === row.pokemon_id &&
				raid.form === form &&
				raid.temp_evolution_id === row.temp_evolution_id
		);

		if (existingRaid) {
			existingRaid.count = (existingRaid.count ?? 0) + count;
		} else {
			activeRaids.push({
				level: row.level,
				pokemon_id: row.pokemon_id,
				form,
				temp_evolution_id: row.temp_evolution_id,
				count
			});
		}
	}

	for (const row of allContestStats) {
		const count = Number(row.count ?? 0);

		const focus = JSON.parse(row.focus) as ContestFocus;
		if (focus.type === "pokemon" && focus.pokemon_form) {
			focus.pokemon_form = getNormalizedForm(focus.pokemon_id, focus.pokemon_form);
		}

		const focusKey = JSON.stringify(focus);
		const existingContest = activeContests.find(
			(contest) =>
				contest.ranking_standard === row.ranking_standard &&
				JSON.stringify(contest.focus) === focusKey
		);

		if (existingContest) {
			existingContest.count = (existingContest.count ?? 0) + count;
		} else {
			activeContests.push({
				ranking_standard: row.ranking_standard,
				focus,
				count
			});
		}
	}

	for (const row of allMaxBattlesStats) {
		const count = Number(row.count ?? 0);
		const form = getNormalizedForm(row.pokemon_id, row.form);

		const existingMaxBattle = activeMaxBattles.find(
			(maxBattle) =>
				maxBattle.level === row.level &&
				maxBattle.pokemon_id === row.pokemon_id &&
				maxBattle.form === form &&
				maxBattle.bread_mode === row.bread_mode
		);

		if (existingMaxBattle) {
			existingMaxBattle.count = (existingMaxBattle.count ?? 0) + count;
		} else {
			activeMaxBattles.push({
				level: row.level,
				pokemon_id: row.pokemon_id,
				form,
				bread_mode: row.bread_mode,
				count
			});
		}
	}

	for (const row of allNestsStats) {
		const count = Number(row.count ?? 0);
		const form = getNormalizedForm(row.pokemon_id, row.form);

		const existingNest = activeNests.find(
			(nest) => nest.pokemon_id === row.pokemon_id && nest.form === form
		);

		if (existingNest) {
			existingNest.count += count;
		} else {
			activeNests.push({
				pokemon_id: row.pokemon_id,
				form,
				count
			});
		}
	}

	const activeEggs: EggStats[] = [];
	if (Array.isArray(eggsData)) {
		for (const egg of eggsData) {
			const { pokemonId, formId } = extractPokemonIdFromLeekduckImage(egg?.image ?? "");
			if (!pokemonId) continue;

			const kmMatch = egg?.eggType?.match(/(\d+)/);
			const km = kmMatch ? kmMatch[1] : "0";

			activeEggs.push({
				pokemon_id: pokemonId,
				form: getNormalizedForm(pokemonId, formId),
				km: Number(km),
				rarity: egg?.rarity ?? 0,
				shiny: egg?.canBeShiny ?? false,
				isAdventureSync: egg?.isAdventureSync ?? false,
				isRegional: egg?.isRegional ?? false,
				isGift: egg?.isGiftExchange ?? false
			});
		}
	}

	const activeCharacters: ActiveInvasionCharacterStats[] = [];

	for (const row of allCharacterStats) {
		activeCharacters.push({
			character: row.character,
			count: Number(row.count ?? 0),
			first: [],
			second: [],
			third: []
		});
	}

	if (Array.isArray(invasionLineupsData)) {
		for (const lineup of invasionLineupsData) {
			const characterId = getInvasionCharacterId(lineup.name, lineup.type);
			if (!characterId) {
				log.info("Could not match grunt to character id: %s", lineup.name);
				continue;
			}
			log.debug("Matched character name %s to id %d", lineup.name, characterId);

			const characterEntry = activeCharacters.find((c) => c.character === characterId);
			if (!characterEntry) {
				continue;
			}

			const processPokemon = (pokemon: any[]): InvasionPokemonStats[] => {
				return pokemon
					.map((p) => {
						const { pokemonId, formId } = extractPokemonIdFromLeekduckImage(p.image);
						return {
							pokemon_id: pokemonId,
							form: getNormalizedForm(pokemonId, formId),
							encounter: p?.isEncounter ?? false,
							shiny: p?.canBeShiny ?? false
						};
					})
					.filter((p) => p.pokemon_id);
			};

			characterEntry.first = processPokemon(lineup.firstPokemon);
			characterEntry.second = processPokemon(lineup.secondPokemon);
			characterEntry.third = processPokemon(lineup.thirdPokemon);
		}
	}

	return {
		totalPokemon: {
			count: pokemonTotal,
			days: pokemonTotalDays
		},
		pokemon,
		totalQuests: {
			count: questsTotal
		},
		quests,
		activeRaids,
		activeCharacters,
		activeContests,
		activeMaxBattles,
		activeNests,
		activeEggs: activeEggs,
		generatedAt: Date.now()
	};
}

// gmax battles are the level-6 tier; verified against ingameLocale.ts:135
// (1 = dynamax, 2 = gigantamax). Live spot check against `station` (SELECT DISTINCT
// battle_level, battle_pokemon_bread_mode FROM station WHERE battle_pokemon_bread_mode
// IS NOT NULL) was not possible in this environment (no DB access) — pending.
const BREAD_MODE_DYNAMAX = 1;
const BREAD_MODE_GIGANTAMAX = 2;

/**
 * Merges the ≤60s-fresh Golbat fort availability cache into the hourly SQL-built
 * MasterStats, replacing the pick-list-relevant fields (active raids, max battles,
 * contests, quests) when the fort API is on. No-op otherwise.
 */
export function mergeFortAvailability(stats: MasterStats): MasterStats {
	const availability = getCachedFortAvailability();
	if (!isFortApiEnabled() || !availability) return stats;

	const activeRaids: ActiveRaidStats[] = availability.gyms.raids
		.filter((r) => r.pokemon_id)
		.map((r) => ({
			level: r.raid_level,
			pokemon_id: r.pokemon_id!,
			form: getNormalizedForm(r.pokemon_id!, r.form ?? 0),
			// not in availability yet (Golbat enrichment PR pending) — 0 until it lands
			temp_evolution_id: 0
		}));

	const activeMaxBattles: MaxBattleStatsEntry[] = availability.stations.battles
		.filter((b) => b.pokemon_id)
		.map((b) => ({
			level: b.battle_level,
			pokemon_id: b.pokemon_id!,
			form: getNormalizedForm(b.pokemon_id!, b.form ?? 0),
			bread_mode: b.battle_level >= 6 ? BREAD_MODE_GIGANTAMAX : BREAD_MODE_DYNAMAX
		}));

	const activeContests: ContestStatsEntry[] = availability.pokestops.showcases
		// A row with no pokemon_id and no type_id is a junk/incomplete showcase entry
		// (Golbat has no confirmed focus for it yet) — skip rather than fabricate a
		// bogus "type" focus with pokemon_type_1: 0.
		.filter((s) => s.pokemon_id !== null || s.type_id !== null)
		.map((s) => ({
			// ranking_standard not in availability yet (Golbat enrichment PR pending)
			ranking_standard: 0,
			focus: s.pokemon_id
				? ({
						type: "pokemon",
						pokemon_id: s.pokemon_id,
						pokemon_form: getNormalizedForm(s.pokemon_id, s.form ?? 0)
					} satisfies ContestFocusPokemon)
				: ({ type: "type", pokemon_type_1: s.type_id ?? 0 } satisfies ContestFocusType)
		}));

	const quests: QuestStats = {};
	let questsTotal = 0;
	for (const q of availability.pokestops.quests) {
		const reward = questRewardFromAvailability(q);
		if (!reward) continue;

		// with_ar intentionally excluded — AR and no-AR variants of the same quest merge
		const key = `${q.reward_type}|${q.item_id}|${q.pokemon_id}|${q.form_id}|${q.amount}|${q.title}|${q.target}`;
		const existing = quests[key];
		if (existing) {
			existing.count += q.count;
		} else {
			quests[key] = { reward, title: q.title, target: q.target, count: q.count };
		}
		// Counted once per availability row regardless of key merge, matching the SQL
		// path which sums every row (merged AR/no-AR variants must still be counted).
		questsTotal += q.count;
	}

	return {
		...stats,
		activeRaids,
		activeMaxBattles,
		activeContests,
		quests,
		totalQuests: { count: questsTotal }
	};
}

function questRewardFromAvailability(
	q: FortAvailability["pokestops"]["quests"][number]
): QuestReward | undefined {
	switch (q.reward_type) {
		case RewardType.ITEM:
			return { type: RewardType.ITEM, info: { item_id: q.item_id, amount: q.amount } };
		case RewardType.POKEMON:
			return {
				type: RewardType.POKEMON,
				info: { pokemon_id: q.pokemon_id, form: getNormalizedForm(q.pokemon_id, q.form_id) }
			};
		case RewardType.CANDY:
			return { type: RewardType.CANDY, info: { pokemon_id: q.pokemon_id, amount: q.amount } };
		case RewardType.XL_CANDY:
			return { type: RewardType.XL_CANDY, info: { pokemon_id: q.pokemon_id, amount: q.amount } };
		case RewardType.MEGA_ENERGY:
			return {
				type: RewardType.MEGA_ENERGY,
				info: { pokemon_id: q.pokemon_id, amount: q.amount }
			};
		case RewardType.STARDUST:
			return { type: RewardType.STARDUST, info: { amount: q.amount } };
		case RewardType.XP:
			return { type: RewardType.XP, info: { amount: q.amount } };
		case RewardType.POKECOINS:
			return { type: RewardType.POKECOINS, info: { amount: q.amount } };
		case RewardType.AVATAR_CLOTHING:
			return { type: RewardType.AVATAR_CLOTHING, info: {} };
		case RewardType.QUEST:
			return { type: RewardType.QUEST, info: {} };
		case RewardType.LEVEL_CAP:
			return { type: RewardType.LEVEL_CAP, info: {} };
		case RewardType.STICKER:
			return { type: RewardType.STICKER, info: {} };
		case RewardType.INCIDENT:
			return { type: RewardType.INCIDENT, info: {} };
		case RewardType.PLAYER_ATTRIBUTE:
			return { type: RewardType.PLAYER_ATTRIBUTE, info: {} };
		case RewardType.EVENT_BADGE:
			return { type: RewardType.EVENT_BADGE, info: {} };
		case RewardType.TEMP_EVO_BRANCH_RESOURCE: {
			// QuestRewardTempEvoBranch is defined in pokestop.d.ts (~line 287) but is
			// misplaced in the ContestFocus union rather than QuestReward (pre-existing
			// bug found in Task 8; not fixed here — pokestop.d.ts is out of this task's
			// file scope). It's live: QuestFilterset.svelte and pokestopUtils.ts both
			// handle RewardType.TEMP_EVO_BRANCH_RESOURCE, so it must not be dropped like
			// the genuinely-unreachable types below. The cast only compensates for the
			// union placement bug — the object shape itself is exactly
			// QuestRewardTempEvoBranch's `info: { amount, pokemon_id }`, not a mismatch.
			const reward: QuestRewardTempEvoBranch = {
				type: RewardType.TEMP_EVO_BRANCH_RESOURCE,
				info: { amount: q.amount, pokemon_id: q.pokemon_id }
			};
			return reward as unknown as QuestReward;
		}
		default:
			// POKEMON_EGG, POKEMON_INDIVIDUAL_STAT, LOOT_TABLE, FRIENDSHIP_POINTS: Golbat's
			// fort availability quest rewards don't surface these today, and pokestop.d.ts
			// doesn't define usable QuestReward members for them (pre-existing; out of
			// scope here) — skip rather than fabricate a shape.
			return undefined;
	}
}
