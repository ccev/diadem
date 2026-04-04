import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { FiltersetPokemon, MinMax } from "@/lib/features/filters/filtersets";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { getBestRank } from "@/lib/utils/pokemonUtils";

function inRange(value: number | null | undefined, range: MinMax): boolean {
	if (value == null) return false;
	return value >= range.min && value <= range.max;
}

export function matchPokemonFilterset(data: PokemonData): FiltersetPokemon | undefined {
	const pokemonFilter = getUserSettings().filters.pokemon;
	if (!pokemonFilter.enabled) return;

	const filtersets = pokemonFilter.filters.filter((f) => f.enabled);
	if (filtersets.length === 0) return;

	for (const filterset of filtersets) {
		if (
			filterset.pokemon &&
			!filterset.pokemon.find((p) => p.pokemon_id === data.pokemon_id && p.form === data.form)
		) {
			continue;
		}

		if (filterset.iv && !inRange(data.iv, filterset.iv)) continue;
		if (filterset.cp && !inRange(data.cp, filterset.cp)) continue;
		if (filterset.ivAtk && !inRange(data.atk_iv, filterset.ivAtk)) continue;
		if (filterset.ivDef && !inRange(data.def_iv, filterset.ivDef)) continue;
		if (filterset.ivSta && !inRange(data.sta_iv, filterset.ivSta)) continue;
		if (filterset.level && !inRange(data.level, filterset.level)) continue;
		if (filterset.size && !inRange(data.size, filterset.size)) continue;

		if (filterset.gender && data.gender != null && !filterset.gender.includes(data.gender)) {
			continue;
		}

		if (filterset.pvpRankLittle) {
			const rank = getBestRank(data, "little");
			if (!rank || !inRange(rank, filterset.pvpRankLittle)) continue;
		}

		if (filterset.pvpRankGreat) {
			const rank = getBestRank(data, "great");
			if (!rank || !inRange(rank, filterset.pvpRankGreat)) continue;
		}

		if (filterset.pvpRankUltra) {
			const rank = getBestRank(data, "ultra");
			if (!rank || !inRange(rank, filterset.pvpRankUltra)) continue;
		}

		return filterset;
	}
}
