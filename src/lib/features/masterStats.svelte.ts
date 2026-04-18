import type {
	ActiveInvasionCharacterStats,
	InvasionPokemonStats,
	ActiveRaidStats,
	ContestStatsEntry,
	EggStats,
	MasterStats,
	MaxBattleStatsEntry,
	NestStatsEntry,
	PokemonStatEntry,
	QuestStats,
	TotalPokemonStats
} from "@/lib/server/api/queryStats";
import { getQuestKey, RewardType } from "@/lib/utils/pokestopUtils";
import type { QuestReward } from "@/lib/types/mapObjectData/pokestop";
import type { PokemonData, PokemonVisual } from "@/lib/types/mapObjectData/pokemon";

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

export function setMasterStats(stats: MasterStats) {
	masterStats = stats;
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
 * this returns all unique quest rewards available today.
 * counts are not included
 */
export function getActiveQuestRewards() {
	if (!masterStats) return undefined;

	const unique = new Map<string, QuestReward>();

	for (const reward of Object.values(masterStats.quests).map((v) => v.reward)) {
		const key = getQuestRewardUniqueKey(reward);
		if (!unique.has(key)) unique.set(key, reward);
	}

	return Array.from(unique.values());
}

export function getQuestCount(reward: string, title: string, target: number) {
	return masterStats?.quests[getQuestKey(reward, title, target)]?.count ?? 0;
}

export function getQuestStatsForRewardFilter(reward: QuestReward) {
	const allQuests = Object.values(masterStats?.quests ?? {});
	return allQuests.find((q) => q.reward === reward);
}

export function getQuestStatsForTask(title: string, target: number) {}

export function getQuestStats() {
	return Object.values(masterStats?.quests ?? {});
}

export function getQuestRewards<T extends RewardType>(
	type: T
): { reward: Extract<QuestReward, { type: T }>; tasks: { title: string; target: number }[] }[] {
	const stats = getQuestStats().filter((q) => q.reward.type === type);

	const groupedMap = new Map<
		string,
		{ reward: QuestReward; tasks: { title: string; target: number }[] }
	>();

	for (const current of stats) {
		const key = getQuestRewardUniqueKey(current.reward);

		const task = { title: current.title, target: current.target };

		const existing = groupedMap.get(key);
		if (existing) {
			existing.tasks.push(task);
		} else {
			groupedMap.set(key, {
				reward: current.reward,
				tasks: [task]
			});
		}
	}

	// @ts-ignore too lazy to type this propery
	return Array.from(groupedMap.values());
}

function getQuestRewardUniqueKey(reward: QuestReward): string {
	const { type } = reward;

	switch (type) {
		case RewardType.ITEM:
			return `${type}|${reward.info.item_id}|${reward.info.amount}`;
		case RewardType.POKEMON:
			return `${type}|${reward.info.pokemon_id}|${reward.info.form}|${reward.info.gender ?? -1}|${reward.info.costume ?? -1}|${reward.info.shiny ? 1 : 0}|${reward.info.temp_evolution_id ?? -1}|${reward.info.alignment ?? -1}|${reward.info.bread_mode ?? -1}`;
		case RewardType.CANDY:
		case RewardType.XL_CANDY:
		case RewardType.MEGA_ENERGY:
			return `${type}|${reward.info.pokemon_id}|${reward.info.amount}`;
		case RewardType.XP:
		case RewardType.STARDUST:
		case RewardType.POKECOINS:
			return `${type}|${reward.info.amount}`;
		default:
			return `${type}`;
	}
}

export function getTotalQuests() {
	return masterStats?.totalQuests?.count ?? 0;
}

export function getActiveRaids(): ActiveRaidStats[] {
	return masterStats?.activeRaids ?? [];
}

export function getActiveCharacters(): ActiveInvasionCharacterStats[] {
	return Object.values(masterStats?.activeCharacters ?? {});
}

export function getInvasionLineup(character: number): ActiveInvasionCharacterStats | undefined {
	return getActiveCharacters().find((entry) => entry.character === character);
}

export function hasInvasionLineup(character: number): boolean {
	const lineup = getInvasionLineup(character);
	if (!lineup) return false;

	return lineup.first.length > 0 || lineup.second.length > 0 || lineup.third.length > 0;
}

export function getInvasionCatchable(character: number): InvasionPokemonStats[] | undefined {
	const lineup = getInvasionLineup(character);
	if (!lineup) return undefined;

	const unique = new Map<string, InvasionPokemonStats>();
	const allSlots = [...lineup.first, ...lineup.second, ...lineup.third];

	for (const pokemon of allSlots) {
		if (!pokemon.encounter) continue;

		const key = `${pokemon.pokemon_id}-${pokemon.form}`;
		if (!unique.has(key)) {
			unique.set(key, pokemon);
		}
	}

	return Array.from(unique.values());
}

export function getInvasionPokemon(characterSlot: Partial<InvasionPokemonStats>): PokemonVisual {
	return {
		pokemon_id: characterSlot.pokemon_id ?? 0,
		form: characterSlot.form ?? 0,
		alignment: 1
	};
}

export function getActiveContests(): ContestStatsEntry[] {
	return masterStats?.activeContests ?? [];
}

export function getActiveMaxBattles(): MaxBattleStatsEntry[] {
	return masterStats?.activeMaxBattles ?? [];
}

export function getActiveNests(): NestStatsEntry[] {
	return masterStats?.activeNests ?? [];
}

export function getActiveEggs(): EggStats[] {
	return masterStats?.activeEggs ?? [];
}

export function getSpawnablePokemon(): PokemonVisual[] {
	const entries: PokemonVisual[] = [];

	for (const [key, stats] of Object.entries(masterStats?.pokemon ?? {})) {
		const [pokemonId, formId] = key.split("-").map(Number);
		if (!pokemonId) continue;

		entries.push({ pokemon_id: pokemonId, form: formId });
	}

	return entries;
}
