import type { FilterPokemon } from "@/lib/features/filters/filters";
import type { FiltersetPokemon, MinMax } from "@/lib/features/filters/filtersets";
import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import { getBestRank, League } from "@/lib/utils/pokemonUtils";

function inRange(value: number | null | undefined, range: MinMax): boolean {
	if (value == null) return false;
	return value >= range.min && value <= range.max;
}

function pokemonMatchesFilterset(data: PokemonData, filterset: FiltersetPokemon): boolean {
	if (
		filterset.pokemon &&
		!filterset.pokemon.find((p) => p.pokemon_id === data.pokemon_id && p.form === data.form)
	) {
		return false;
	}

	if (filterset.iv && !inRange(data.iv, filterset.iv)) return false;
	if (filterset.cp && !inRange(data.cp, filterset.cp)) return false;
	if (filterset.ivAtk && !inRange(data.atk_iv, filterset.ivAtk)) return false;
	if (filterset.ivDef && !inRange(data.def_iv, filterset.ivDef)) return false;
	if (filterset.ivSta && !inRange(data.sta_iv, filterset.ivSta)) return false;
	if (filterset.level && !inRange(data.level, filterset.level)) return false;
	if (filterset.size && !inRange(data.size, filterset.size)) return false;

	if (filterset.gender && data.gender != null && !filterset.gender.includes(data.gender)) {
		return false;
	}

	if (filterset.pvpRankLittle) {
		const rank = getBestRank(data, League.LITTLE);
		if (!rank || !inRange(rank, filterset.pvpRankLittle)) return false;
	}

	if (filterset.pvpRankGreat) {
		const rank = getBestRank(data, League.GREAT);
		if (!rank || !inRange(rank, filterset.pvpRankGreat)) return false;
	}

	if (filterset.pvpRankUltra) {
		const rank = getBestRank(data, League.ULTRA);
		if (!rank || !inRange(rank, filterset.pvpRankUltra)) return false;
	}

	return true;
}

export function matchPokemonFilterset(
	data: PokemonData,
	pokemonFilter: FilterPokemon = getUserSettings().filters.pokemon
): FiltersetPokemon | undefined {
	if (!pokemonFilter.enabled) return;

	const filtersets = pokemonFilter.filters.filter((f) => f.enabled);
	if (filtersets.length === 0) return;

	for (const filterset of filtersets) {
		if (pokemonMatchesFilterset(data, filterset)) return filterset;
	}
}

export function matchPokemonFiltersets(
	data: PokemonData,
	pokemonFilter: FilterPokemon = getUserSettings().filters.pokemon
): FiltersetPokemon[] {
	if (!pokemonFilter.enabled) return [];
	return pokemonFilter.filters.filter(
		(filterset) => filterset.enabled && pokemonMatchesFilterset(data, filterset)
	);
}

export function shouldDisplayPokemon(
	data: PokemonData,
	pokemonFilter: FilterPokemon = getUserSettings().filters.pokemon
) {
	if (isCurrentSelectedOverwrite(data.mapId)) return true;
	if (!pokemonFilter.enabled) return false;
	const filtersets = pokemonFilter.filters.filter((f) => f.enabled);
	if (filtersets.length === 0) return true;

	return Boolean(matchPokemonFilterset(data, pokemonFilter));
}
