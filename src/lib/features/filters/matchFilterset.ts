import type {
	BaseFilterset,
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
import {
	matchesInvasionFilterset,
	matchesMaxBattleFilterset,
	matchesQuestFilterset,
	matchesRaidFilterset
} from "@/lib/features/filters/filtersetMatchers";

function findMatchingFilterset<T extends BaseFilterset>(
	filtersets: T[],
	matches: (filterset: T) => boolean
): T | undefined {
	for (let i = 0; i < filtersets.length; i += 1) {
		const filterset = filtersets[i];
		if (!filterset.enabled) continue;
		if (matches(filterset)) return filterset;
	}
	return undefined;
}

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

export function getMatchingPokemonFilterset(pokemon: PokemonData, filtersets: FiltersetPokemon[]) {
	return findMatchingFilterset(filtersets, (fs) => matchesPokemonFilterset(fs, pokemon));
}

export function getMatchingRaidFilterset(raidData: GymData, filtersets: FiltersetRaid[]) {
	return findMatchingFilterset(filtersets, (fs) => matchesRaidFilterset(fs, raidData));
}

export function getMatchingInvasionFilterset(incident: Incident, filtersets: FiltersetInvasion[]) {
	return findMatchingFilterset(filtersets, (fs) => matchesInvasionFilterset(fs, incident));
}

export function getMatchingQuestFilterset(
	reward: QuestReward,
	title: string,
	target: number,
	isAr: boolean,
	filtersets: FiltersetQuest[]
) {
	return findMatchingFilterset(filtersets, (fs) =>
		matchesQuestFilterset(fs, reward, title, target, isAr)
	);
}

export function getMatchingMaxBattleFilterset(
	station: StationData,
	filtersets: FiltersetMaxBattle[]
) {
	return findMatchingFilterset(filtersets, (fs) => matchesMaxBattleFilterset(fs, station));
}
