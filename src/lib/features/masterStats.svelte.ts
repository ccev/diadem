import type {
	ActiveInvasionCharacterStats,
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
		console.error("Stat fetching failed!");
	}

	masterStats = await response.json();
}

export function getMasterStats() {
	return masterStats;
}

export function getPokemonStats(pokemonId: number, formId: number): PokemonStats | undefined {
	if (!masterStats) return undefined;
	const key = `${pokemonId}-${formId}`;

	return {
		total: masterStats.totalPokemon,
		entry: masterStats.pokemon[key]
	};
}

/**
 * this returns all unique quest rewarda available today.
 * counts are not included
 */
export function getActiveQuestRewards() {
	if (!masterStats) return undefined;

	const rewards = Object.values(masterStats.quests).map((v) => v.reward);
	return rewards.filter(
		(reward, index, self) =>
			index ===
			self.findIndex(
				(r) =>
					r.type === reward.type &&
					// @ts-ignore
					r.info?.item_id === reward.info?.item_id &&
					// @ts-ignore
					r.info?.pokemon_id === reward.info?.pokemon_id &&
					// @ts-ignore
					r.info?.form === reward.info?.form
			)
	);
}

export function getQuestCount(reward: string, title: string, target: number) {
	return masterStats?.quests[getQuestKey(reward, title, target)]?.count ?? 0;
}

export function getQuestStatsForRewardFilter(reward: QuestReward) {
	const allQuests = Object.values(masterStats?.quests ?? {});
	return allQuests.find((q) => q.reward === reward);
}

export function getQuestStatsForTask(title: string, target: number) {}

export function getActiveRaids(): ActiveRaidStats[] {
	return masterStats?.activeRaids ?? [];
}

export function getActiveCharacters(): ActiveInvasionCharacterStats[] {
	return masterStats?.activeCharacters ?? [];
}
