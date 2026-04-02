import type {
	FiltersetInvasion,
	FiltersetMaxBattle,
	FiltersetPokemon,
	FiltersetQuest,
	FiltersetRaid
} from "@/lib/features/filters/filtersets";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { PokemonData, PvpStats } from "@/lib/types/mapObjectData/pokemon";
import type { Incident, QuestReward } from "@/lib/types/mapObjectData/pokestop";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { QuestArType } from "@/lib/features/filters/filterUtilsQuest";
import { RewardType, matchesInvasionRewards } from "@/lib/utils/pokestopUtils";
import { isMaxBattleActive } from "@/lib/utils/stationUtils";

function matchesPokemonSpecies(
	filterPokemon: FiltersetPokemon["pokemon"] | undefined,
	pokemon: PokemonData
) {
	if (!filterPokemon || filterPokemon.length === 0) return true;

	const dataForm = pokemon.form ?? 0;
	return filterPokemon.some((candidate) => {
		if (candidate.pokemon_id !== pokemon.pokemon_id) return false;
		return candidate.form === dataForm;
	});
}

function getBestRank(entries: PvpStats[] | undefined) {
	if (!entries || entries.length === 0) return null;
	const validRanks = entries
		.map((entry) => entry.rank)
		.filter((rank) => Number.isFinite(rank) && rank > 0);
	if (!validRanks.length) return null;
	return Math.min(...validRanks);
}

function matchesPokemonFilterset(filterset: FiltersetPokemon, pokemon: PokemonData) {
	if (!matchesPokemonSpecies(filterset.pokemon, pokemon)) return false;

	if (filterset.iv) {
		if (pokemon.iv === null) return false;
		if (pokemon.iv < filterset.iv.min || pokemon.iv > filterset.iv.max) return false;
	}

	if (filterset.ivAtk) {
		if (pokemon.atk_iv === null) return false;
		if (pokemon.atk_iv < filterset.ivAtk.min || pokemon.atk_iv > filterset.ivAtk.max) return false;
	}

	if (filterset.ivDef) {
		if (pokemon.def_iv === null) return false;
		if (pokemon.def_iv < filterset.ivDef.min || pokemon.def_iv > filterset.ivDef.max) return false;
	}

	if (filterset.ivSta) {
		if (pokemon.sta_iv === null) return false;
		if (pokemon.sta_iv < filterset.ivSta.min || pokemon.sta_iv > filterset.ivSta.max) return false;
	}

	if (filterset.cp) {
		if (pokemon.cp === null) return false;
		if (pokemon.cp < filterset.cp.min || pokemon.cp > filterset.cp.max) return false;
	}

	if (filterset.level) {
		if (pokemon.level === null) return false;
		if (pokemon.level < filterset.level.min || pokemon.level > filterset.level.max) return false;
	}

	if (filterset.gender && filterset.gender.length > 0) {
		if (pokemon.gender === null) return false;
		if (!filterset.gender.includes(pokemon.gender)) return false;
	}

	if (filterset.size) {
		if (pokemon.size === null) return false;
		if (pokemon.size < filterset.size.min || pokemon.size > filterset.size.max) return false;
	}

	if (filterset.pvpRankLittle) {
		const rank = getBestRank(pokemon.pvp?.little);
		if (rank === null) return false;
		if (rank < filterset.pvpRankLittle.min || rank > filterset.pvpRankLittle.max) return false;
	}

	if (filterset.pvpRankGreat) {
		const rank = getBestRank(pokemon.pvp?.great);
		if (rank === null) return false;
		if (rank < filterset.pvpRankGreat.min || rank > filterset.pvpRankGreat.max) return false;
	}

	if (filterset.pvpRankUltra) {
		const rank = getBestRank(pokemon.pvp?.ultra);
		if (rank === null) return false;
		if (rank < filterset.pvpRankUltra.min || rank > filterset.pvpRankUltra.max) return false;
	}

	return true;
}

function matchesRaidBoss(bosses: FiltersetRaid["bosses"] | undefined, raidData: GymData) {
	if (!bosses || bosses.length === 0 || !raidData.raid_pokemon_id) return false;
	const raidForm = raidData.raid_pokemon_form ?? 0;

	return bosses.some((boss) => {
		if (boss.pokemon_id !== raidData.raid_pokemon_id) return false;
		return boss.form === raidForm;
	});
}

function matchesRaidFilterset(filterset: FiltersetRaid, raidData: GymData) {
	const isEgg = !raidData.raid_pokemon_id;

	if (filterset.show && filterset.show.length > 0) {
		if (isEgg && !filterset.show.includes("egg")) return false;
		if (!isEgg && !filterset.show.includes("boss")) return false;

		if (!filterset.levels && !filterset.bosses) return true;
	}

	if (filterset.levels && filterset.levels.length > 0) {
		if (raidData.raid_level && filterset.levels.includes(raidData.raid_level)) return true;
	}

	if (matchesRaidBoss(filterset.bosses, raidData)) return true;
	return false;
}

function matchesInvasionFilterset(filterset: FiltersetInvasion, incident: Incident) {
	if (filterset.characters?.includes(incident.character)) return true;
	return matchesInvasionRewards(filterset.rewards, incident);
}

function matchesQuestFilterset(
	filterset: FiltersetQuest,
	reward: QuestReward,
	title: string,
	target: number,
	isAr: boolean
) {
	if (filterset.ar) {
		if (filterset.ar === QuestArType.AR && !isAr) return false;
		if (filterset.ar === QuestArType.NOAR && isAr) return false;
	}

	if (filterset.rewardType && filterset.rewardType !== reward.type) return false;

	if (
		filterset.tasks &&
		!filterset.tasks.find((task) => task.title === title && task.target === target)
	) {
		return false;
	}

	const hasRewardMatcher = Boolean(
		filterset.stardust ||
			filterset.xp ||
			filterset.pokemon ||
			filterset.item ||
			filterset.megaResource ||
			filterset.candy ||
			filterset.xlCandy
	);

	if (filterset.rewardType && !hasRewardMatcher) return true;

	if (
		filterset.stardust &&
		reward.type === RewardType.STARDUST &&
		reward.info.amount >= filterset.stardust.min &&
		reward.info.amount <= filterset.stardust.max
	) {
		return true;
	}

	if (
		filterset.xp &&
		reward.type === RewardType.XP &&
		reward.info.amount >= filterset.xp.min &&
		reward.info.amount <= filterset.xp.max
	) {
		return true;
	}

	if (
		filterset.pokemon &&
		reward.type === RewardType.POKEMON &&
		filterset.pokemon.find((pokemon) => {
			const rewardForm = reward.info.form ?? 0;
			return pokemon.pokemon_id === reward.info.pokemon_id && pokemon.form === rewardForm;
		})
	) {
		return true;
	}

	if (
		filterset.item &&
		reward.type === RewardType.ITEM &&
		filterset.item.find(
			(item) =>
				item.id === reward.info.item_id.toString() &&
				(item.amount === undefined || item.amount === reward.info.amount)
		)
	) {
		return true;
	}

	if (
		filterset.megaResource &&
		reward.type === RewardType.MEGA_ENERGY &&
		filterset.megaResource.find(
			(item) =>
				item.id === reward.info.pokemon_id.toString() &&
				(item.amount === undefined || item.amount === reward.info.amount)
		)
	) {
		return true;
	}

	if (
		filterset.candy &&
		reward.type === RewardType.CANDY &&
		filterset.candy.find(
			(item) =>
				item.id === reward.info.pokemon_id.toString() &&
				(item.amount === undefined || item.amount === reward.info.amount)
		)
	) {
		return true;
	}

	if (
		filterset.xlCandy &&
		reward.type === RewardType.XL_CANDY &&
		filterset.xlCandy.find(
			(item) =>
				item.id === reward.info.pokemon_id.toString() &&
				(item.amount === undefined || item.amount === reward.info.amount)
		)
	) {
		return true;
	}

	return false;
}

export function getMatchingPokemonFilterset(pokemon: PokemonData, filtersets: FiltersetPokemon[]) {
	// Visual precedence follows list order: later enabled matches override earlier ones.
	for (let i = filtersets.length - 1; i >= 0; i -= 1) {
		const filterset = filtersets[i];
		if (!filterset.enabled) continue;
		if (matchesPokemonFilterset(filterset, pokemon)) return filterset;
	}
	return undefined;
}

export function getMatchingRaidFilterset(raidData: GymData, filtersets: FiltersetRaid[]) {
	for (let i = filtersets.length - 1; i >= 0; i -= 1) {
		const filterset = filtersets[i];
		if (!filterset.enabled) continue;
		if (matchesRaidFilterset(filterset, raidData)) return filterset;
	}
	return undefined;
}

export function getMatchingInvasionFilterset(incident: Incident, filtersets: FiltersetInvasion[]) {
	for (let i = filtersets.length - 1; i >= 0; i -= 1) {
		const filterset = filtersets[i];
		if (!filterset.enabled) continue;
		if (matchesInvasionFilterset(filterset, incident)) return filterset;
	}
	return undefined;
}

export function getMatchingQuestFilterset(
	reward: QuestReward,
	title: string,
	target: number,
	isAr: boolean,
	filtersets: FiltersetQuest[]
) {
	for (let i = filtersets.length - 1; i >= 0; i -= 1) {
		const filterset = filtersets[i];
		if (!filterset.enabled) continue;
		if (matchesQuestFilterset(filterset, reward, title, target, isAr)) return filterset;
	}
	return undefined;
}

function matchesMaxBattleFilterset(filterset: FiltersetMaxBattle, station: StationData) {
	if (
		filterset.bosses === undefined &&
		!filterset.isActive &&
		!filterset.hasGmax &&
		(!filterset.levels || filterset.levels.length === 0)
	) {
		return true;
	}

	if (filterset.isActive && !isMaxBattleActive(station)) {
		return false;
	}

	if (filterset.hasGmax && (station.total_stationed_gmax ?? 0) === 0) {
		return false;
	}

	if (
		filterset.levels &&
		filterset.levels.length > 0 &&
		(!station.battle_level || !filterset.levels.includes(station.battle_level))
	) {
		return false;
	}

	if (
		filterset.bosses &&
		filterset.bosses.length > 0 &&
		!filterset.bosses.some(
			(p) =>
				p.pokemon_id === station.battle_pokemon_id &&
				p.form === station.battle_pokemon_form &&
				(p.bread_mode === undefined || p.bread_mode === station.battle_pokemon_bread_mode)
		)
	) {
		return false;
	}

	if (filterset.bosses && filterset.bosses.length > 0) {
		return true;
	}

	return Boolean(filterset.isActive || filterset.hasGmax || filterset.levels?.length);
}

export function getMatchingMaxBattleFilterset(
	station: StationData,
	filtersets: FiltersetMaxBattle[]
) {
	for (let i = filtersets.length - 1; i >= 0; i -= 1) {
		const filterset = filtersets[i];
		if (!filterset.enabled) continue;
		if (matchesMaxBattleFilterset(filterset, station)) return filterset;
	}
	return undefined;
}
