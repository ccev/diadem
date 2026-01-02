import { query } from "@/lib/server/db/external/internalQuery";
import type { QuestReward } from "@/lib/types/mapObjectData/pokestop";
import { getQuestKey } from "@/lib/utils/pokestopUtils";

type AllShinyStatsRow = {
	pokemon_id: number;
	form_id: number;
	"": {
		shinies: string;
		total: string;
		days: number;
	}[];
};

type AllSpawnStatsRow = {
	pokemon_id: number;
	form_id: number;
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

export type ActiveRaidStats = {
	level: number;
	pokemon_id: number;
	form: number;
	count: number
}

export type ActiveInvasionCharacterStats = {
	character: number;
	count: number
}

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

export type MasterStats = {
	totalPokemon: TotalPokemonStats;
	pokemon: {
		[key: string]: PokemonStatEntry; // key format: "pokemonId-formId"
	};
	totalQuests: TotalQuestStats;
	quests: QuestStats;
	activeRaids: ActiveRaidStats[];
	activeCharacters: ActiveInvasionCharacterStats[];
	generatedAt: number;
};

export async function queryMasterStats(): Promise<MasterStats> {
	// TODO: timeframe
	// TODO: this takes a while, and it's cached. but the cache is only filled when a user requests this. amybe there should instead be a cronjob

	const [allShinyStats, allSpawnStats, allQuestStats, allRaidStats, allCharacterStats] = await Promise.all([
		query<AllShinyStatsRow[]>(
			"SELECT pokemon_id, form_id, SUM(count) as shinies, SUM(total) as total, COUNT(*) as days " +
				"FROM pokemon_shiny_stats " +
				"WHERE fence = 'world' " +
				"GROUP BY pokemon_id, form_id "
		),
		query<AllSpawnStatsRow[]>(
			"SELECT pokemon_id, form_id, SUM(count) as count, " +
				"(SELECT SUM(count) FROM pokemon_stats WHERE fence = 'world') as total_spawns, " +
				"COUNT(DISTINCT date) as days " +
				"FROM pokemon_stats " +
				"WHERE fence = 'world' " +
				"GROUP BY pokemon_id, form_id " +
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
		query<ActiveRaidStats[]>(
			"SELECT level, pokemon_id, form_id as form, count " +
			"FROM raid_stats " +
			"WHERE date = (SELECT MAX(date) FROM raid_stats) AND area = 'world' " +
			"ORDER BY level ASC"
		),
		query<ActiveInvasionCharacterStats[]>(
			"SELECT `character`, `count` " +
			"FROM invasion_stats " +
			"WHERE date = (SELECT MAX(date) FROM invasion_stats) AND area = 'world' " +
			"ORDER BY `character` ASC"
		)
	]);

	const pokemon: { [key: string]: PokemonStatEntry } = {};
	let pokemonTotal = 0;
	let pokemonTotalDays = 0;

	const quests: QuestStats = {};
	let questsTotal = 0;

	let activeRaids: ActiveRaidStats[] = []
	let activeCharacters: ActiveInvasionCharacterStats[] = []

	if (allShinyStats.result) {
		for (const row of allShinyStats.result) {
			const key = `${row.pokemon_id}-${row.form_id}`;
			if (!pokemon[key]) {
				pokemon[key] = {};
			}
			const stats = row[""][0];
			pokemon[key].shiny = {
				shinies: Number(stats?.shinies ?? 0),
				total: Number(stats?.total ?? 0),
				days: stats?.days ?? 0
			};
		}
	}

	if (allSpawnStats.result) {
		for (const row of allSpawnStats.result) {
			const key = `${row.pokemon_id}-${row.form_id}`;
			if (!pokemon[key]) {
				pokemon[key] = {};
			}
			const stats = row[""][0];

			const thisTotal = Number(stats?.total_spawns ?? 0);
			if (!pokemonTotal && thisTotal) {
				pokemonTotal = thisTotal;
				pokemonTotalDays = stats?.days ?? 0;
			}

			pokemon[key].spawns = {
				count: Number(stats?.count ?? 0),
				days: stats?.days ?? 0
			};
		}
	}

	if (allQuestStats.result) {
		for (const row of allQuestStats.result) {
			const questRewards: QuestReward[] = JSON.parse(row.quest_rewards);
			if (questRewards.length !== 1) continue;

			const key = getQuestKey(row.quest_rewards, row.quest_title, row.quest_target);
			const count = Number(row[""][0]?.count ?? 0)
			questsTotal += count;

			quests[key] = {
				reward: questRewards[0],
				title: row.quest_title,
				target: row.quest_target,
				count: count
			};
		}
	}

	if (allRaidStats.result) {
		activeRaids = allRaidStats.result
	}

	if (allCharacterStats.result) {
		activeCharacters = allCharacterStats.result
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
		generatedAt: Date.now()
	};
}
