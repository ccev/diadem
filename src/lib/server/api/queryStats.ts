import { query } from "@/lib/server/db/external/internalQuery";
import type { ContestFocus, QuestReward } from "@/lib/types/mapObjectData/pokestop";
import { getQuestKey, parseQuestReward, RewardType } from "@/lib/utils/pokestopUtils";
import { getMasterFile, getMasterPokemon } from "@/lib/services/masterfile";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("masterstats");
const scrapedDuckUrl = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/";

type AllShinyStatsRow = {
	pokemon_id: number;
	form: number;
	"": {
		shinies: string;
		total: string;
		days: number;
	}[];
};

type AllSpawnStatsRow = {
	pokemon_id: number;
	form: number;
	"": {
		count: string;
		total_spawns: string;
		days: number;
	}[];
};

type QuestStatsRow = {
	quest_rewards: string;
	quest_title: string;
	quest_target: number;
	"": {
		count: number;
	}[];
};

type ContestStatsRow = {
	ranking_standard: number;
	focus: string;
	"": {
		count: number;
	}[];
};

type MaxBattleStatsRow = {
	level: number;
	pokemon_id: number;
	form: number;
	bread_mode: number;
	"": {
		count: number;
	}[];
};

type NestStatsRow = {
	pokemon_id: number;
	form: number;
	"": {
		count: number;
	}[];
};

type RaidStatsRow = {
	level: number;
	pokemon_id: number;
	form: number;
	temp_evolution_id: number,
	"": {
		count: number;
	}[];
};

export type ActiveRaidStats = {
	level: number;
	pokemon_id: number;
	form: number;
	temp_evolution_id: number;
	count: number;
};

type InvasionStatsRow = {
	character: number;
	"": {
		count: number;
	}[];
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
	count: number;
};

export type MaxBattleStatsEntry = {
	level: number;
	pokemon_id: number;
	form: number;
	bread_mode: number;
	count: number;
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
		query<QuestStatsRow[]>(
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
		query<ContestStatsRow[]>(
			"SELECT showcase_ranking_standard AS ranking_standard, showcase_focus AS focus, COUNT(*) as count " +
				"FROM pokestop " +
				"WHERE showcase_ranking_standard IS NOT NULL " +
				"AND showcase_focus IS NOT NULL " +
				"AND last_modified_timestamp > UNIX_TIMESTAMP() - 86400 " +
				"GROUP BY 1, 2"
		),
		query<MaxBattleStatsRow[]>(
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
		fetch(`${scrapedDuckUrl}eggs.min.json`)
			.then((res) => res.json())
			.catch((e) => {
				log.error("Failed to fetch eggs data: %s", e);
				return [];
			}),
		fetch(`${scrapedDuckUrl}rocketLineups.min.json`)
			.then((res) => res.json())
			.catch((e) => {
				log.error("Failed to fetch invasion lineups data: %s", e);
				return [];
			})
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

	if (allShinyStats.result) {
		for (const row of allShinyStats.result) {
			const form = getNormalizedForm(row.pokemon_id, row.form);

			const key = `${row.pokemon_id}-${form}`;
			if (!pokemon[key]) {
				pokemon[key] = {};
			}

			const stats = row[""][0];
			const shinies = Number(stats?.shinies ?? 0);
			const total = Number(stats?.total ?? 0);

			if (pokemon[key].shiny) {
				pokemon[key].shiny.shinies += shinies;
				pokemon[key].shiny.total += total;
			} else {
				pokemon[key].shiny = {
					shinies,
					total,
					days: stats?.days ?? 0
				};
			}
		}
	}

	if (allSpawnStats.result) {
		for (const row of allSpawnStats.result) {
			const form = getNormalizedForm(row.pokemon_id, row.form);

			const key = `${row.pokemon_id}-${form}`;
			if (!pokemon[key]) {
				pokemon[key] = {};
			}
			const stats = row[""][0];

			const thisTotal = Number(stats?.total_spawns ?? 0);
			if (!pokemonTotal && thisTotal) {
				pokemonTotal = thisTotal;
				pokemonTotalDays = stats?.days ?? 0;
			}

			const count = Number(stats?.count ?? 0);
			if (pokemon[key].spawns) {
				pokemon[key].spawns.count += count;
			} else {
				pokemon[key].spawns = {
					count,
					days: stats?.days ?? 0
				};
			}
		}
	}

	if (allQuestStats.result) {
		for (const row of allQuestStats.result) {
			const questReward = parseQuestReward(row.quest_rewards);
			if (!questReward) continue;

			if (questReward.type === RewardType.POKEMON) {
				questReward.info.form = getNormalizedForm(
					questReward.info.pokemon_id,
					questReward.info.form
				);
			}

			const key = getQuestKey(row.quest_rewards, row.quest_title, row.quest_target);
			const count = Number(row[""][0]?.count ?? 0);
			questsTotal += count;

			quests[key] = {
				reward: questReward,
				title: row.quest_title,
				target: row.quest_target,
				count: count
			};
		}
	}

	if (allRaidStats.result) {
		for (const row of allRaidStats.result) {
			const form = getNormalizedForm(row.pokemon_id, row.form);
			const count = Number(row[""][0]?.count ?? 0);
			activeRaids.push({
				level: row.level,
				pokemon_id: row.pokemon_id,
				form,
				temp_evolution_id: row.temp_evolution_id,
				count
			});
		}
	}

	if (allContestStats.result) {
		for (const row of allContestStats.result) {
			const count = Number(row[""][0]?.count ?? 0);

			const focus = JSON.parse(row.focus) as ContestFocus;
			if (focus.type === "pokemon" && focus.pokemon_form) {
				focus.pokemon_form = getNormalizedForm(focus.pokemon_id, focus.pokemon_form);
			}

			activeContests.push({
				ranking_standard: row.ranking_standard,
				focus: focus,
				count
			});
		}
	}

	if (allMaxBattlesStats.result) {
		for (const row of allMaxBattlesStats.result) {
			const count = Number(row[""][0]?.count ?? 0);
			activeMaxBattles.push({
				level: row.level,
				pokemon_id: row.pokemon_id,
				form: getNormalizedForm(row.pokemon_id, row.form),
				bread_mode: row.bread_mode,
				count
			});
		}
	}

	if (allNestsStats.result) {
		for (const row of allNestsStats.result) {
			const count = Number(row[""][0]?.count ?? 0);
			activeNests.push({
				pokemon_id: row.pokemon_id,
				form: getNormalizedForm(row.pokemon_id, row.form),
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

	if (allCharacterStats.result) {
		for (const row of allCharacterStats.result) {
			activeCharacters.push({
				character: row.character,
				count: Number(row[""][0]?.count ?? 0),
				first: [],
				second: [],
				third: []
			});
		}
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
