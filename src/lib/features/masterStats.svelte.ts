import type {
	ActiveRaidStats,
	MasterStats,
	PokemonStatEntry,
	TotalPokemonStats
} from "@/lib/server/api/queryStats";
import { getQuestKey } from "@/lib/utils/pokestopUtils";
import type { QuestReward } from "@/lib/types/mapObjectData/pokestop";

let masterStats: MasterStats | undefined = $state(undefined);

export type PokemonStats = {
	total: TotalPokemonStats;
	entry: PokemonStatEntry | undefined;
};

export async function loadMasterStats() {
	const response = await fetch("/api/stats");

	if (!response.ok) {
		console.error("Stat fetching failed!")
	}

	masterStats = await response.json();
}

export function getMasterStats() {
	return masterStats
}

export function getPokemonStats(pokemonId: number, formId: number): PokemonStats | undefined {
	if (!masterStats) return undefined
	const key = `${pokemonId}-${formId}`;

	return {
		total: masterStats.totalPokemon,
		entry: masterStats.pokemon[key]
	}
}

export function getQuestCount(reward: string, title: string, target: number) {
	return masterStats?.quests[getQuestKey(reward, title, target)]?.count ?? 0
}

export function getQuestStatsForRewardFilter(reward: QuestReward) {
	const allQuests = Object.values(masterStats?.quests ?? {})
	return allQuests.find(q => q.reward === reward)
}

export function getQuestStatsForTask(title: string, target: number) {
	
}

export function getActiveRaids(): ActiveRaidStats[] {
	return masterStats?.activeRaids ?? []
}
