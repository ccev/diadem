import { POKEMON_MIN_RANK } from "@/lib/constants";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import * as m from "@/lib/paraglide/messages";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import type { MasterPokemon } from "@/lib/types/masterfile";
import { getMasterPokemon } from "@/lib/services/masterfile";
import type { FilterPokemon } from "@/lib/features/filters/filters";
import { getActiveSearch } from "@/lib/features/activeSearch.svelte";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export const pokemonSizes = {
	1: "XXS",
	2: "XS",
	3: "M",
	4: "XL",
	5: "XXL"
};

const typeNames = new Map([
	[1, "normal"],
	[2, "fighting"],
	[3, "flying"],
	[4, "poison"],
	[5, "ground"],
	[6, "rock"],
	[7, "bug"],
	[8, "ghost"],
	[9, "steel"],
	[10, "fire"],
	[11, "water"],
	[12, "grass"],
	[13, "electric"],
	[14, "psychic"],
	[15, "ice"],
	[16, "dragon"],
	[17, "dark"],
	[18, "fairy"]
]);

// NORMAL_FORMS are a relict from when shadows and purified
// were different forms. Every shadow-available species
// got a normal form. Nowadays, base species can appear
// as both form = 0 and form = NORMAL (the number differs per species)
// in order to tackle this, diadem converts: <NORMAL_FORM -> 0>
//
// however, some pokemon (like unown or burmy) have no "base species".
// in this case, it makes sense to actually keep the NORMAL_FORM.
// They shouldn't be available as form = 0, but just to make sure,
// they're converted: <0 -> NORMAL_FORM>
export const reverseNormalizedFormPokemonIds = new Set([
	201, // unown
	327, // spinda
	412, // burmy
	413, // wormadam
	421, // cherrim
	422, // shellos
	423, // gastrodon
	492, // shaymin
	493, // arceus
	550, // basculin
	585, // deerling
	586, // sawsbuck
	641, // tornadus
	642, // thundurus
	645, // landorus
	647, // keldeo
	648, // meloetta
	664, // scatterbug
	665, // spewpa
	666, // vivillon
	669, // flabebe
	670, // floette
	671, // florges
	676, // furfrou
	710, // pumpkaboo
	711, // gourgeist
	716, // xerneas
	718, // zygarde
	720, // hoopa
	741, // oricorio
	746, // wishiwashi
	773, // silvally
	774, // minior
	800, // necrozma
	849, // toxtricity
	854, // sinistea
	855, // polteageist
	875, // eicue
	876, // indeedee
	877, // morpeko
	888, // zacian
	889, // zamazenta
	892, // urshifu
	905, // enamorus
	925, // maushold
	931, // squawkabilly
	964, // palafin
	978, // tatsugiri
	982, // dudunsparce
	1012, // poltchageist
	1013 // sinistcha
]);

export function getActivePokemonFilter() {
	const activeSearch = getActiveSearch();
	if (activeSearch && activeSearch.mapObject === MapObjectType.POKEMON) {
		return activeSearch.filter as FilterPokemon;
	}
	return getUserSettings().filters.pokemon;
}

export function hasTimer(data: {
	expire_timestamp: number | null | undefined;
	expire_timestamp_verified: number | boolean | null | undefined;
}) {
	return data.expire_timestamp && data.expire_timestamp_verified;
}

export function getBestRank(data: Partial<PokemonData>, league: "little" | "great" | "ultra") {
	const ranks = data.pvp?.[league]?.map((l) => l.rank) ?? [0];
	const best = Math.min(...ranks);
	if (!Number.isInteger(best)) return 0;
	return best;
}

export function showPvp(
	rank: number,
	filterAttribute: "pvpRankLittle" | "pvpRankGreat" | "pvpRankUltra",
	ignoreFilters: boolean = false,
	pokemonFilters: FilterPokemon | null = getActivePokemonFilter()
) {
	const always = rank > 0 && rank <= POKEMON_MIN_RANK;
	if (always || ignoreFilters || !pokemonFilters) return true;

	const filters = pokemonFilters.filters.filter((f) => f.enabled);
	for (const filter of filters) {
		if (filter[filterAttribute]) {
			if (rank >= filter[filterAttribute].min && rank <= filter[filterAttribute].max) {
				return true;
			}
		}
	}
	return false;
}

export function showLittle(
	data: Partial<PokemonData>,
	ignoreFilters: boolean = false,
	pokemonFilters: FilterPokemon = getActivePokemonFilter()
) {
	const bestRank = getBestRank(data, "little");
	return showPvp(bestRank, "pvpRankLittle", ignoreFilters, pokemonFilters);
}

export function showGreat(
	data: Partial<PokemonData>,
	ignoreFilters: boolean = false,
	pokemonFilters: FilterPokemon = getActivePokemonFilter()
) {
	const bestRank = getBestRank(data, "great");
	return showPvp(bestRank, "pvpRankGreat", ignoreFilters, pokemonFilters);
}

export function showUltra(
	data: Partial<PokemonData>,
	ignoreFilters: boolean = false,
	pokemonFilters: FilterPokemon = getActivePokemonFilter()
) {
	const bestRank = getBestRank(data, "ultra");
	return showPvp(bestRank, "pvpRankUltra", ignoreFilters, pokemonFilters);
}

export function getPokemonSize(size: number) {
	return pokemonSizes[size] ?? "?";
}

export function getGenderLabel(gender: number) {
	if (gender === 1) {
		return m.pokemon_gender_male();
	} else if (gender === 2) {
		return m.pokemon_gender_female();
	} else {
		return m.pokemon_gender_neutral();
	}
}

export function getRarityLabel(count: number, totalSpawns: number) {
	if (totalSpawns === 0) return m.rarity_legendary();
	const ratio = count / totalSpawns;
	if (ratio > 0.01) return m.rarity_common();
	if (ratio > 0.001) return m.rarity_uncommon();
	if (ratio > 0.0001) return m.rarity_rare();
	if (ratio > 0.00001) return m.rarity_very_rare();
	if (ratio > 0.000001) return m.rarity_extremely_rare();
	return m.rarity_legendary();
}

export function typeIdToText(typeId: number | undefined) {
	if (!typeId) return "normal";
	return typeNames.get(typeId) ?? "normal";
}

export function masterPokemonToTypeText(masterPokemon: MasterPokemon) {
	return typeIdToText(masterPokemon?.types?.[1] ?? masterPokemon?.types?.[0]);
}

export function getNormalizedForm(
	pokemonId: number | undefined | null,
	formId: number | undefined | null
) {
	if (!pokemonId) return formId ?? 0;

	const masterPokemon = getMasterPokemon(pokemonId);
	if (!masterPokemon) return formId ?? 0;

	if (reverseNormalizedFormPokemonIds.has(pokemonId)) {
		if (formId === 0) {
			formId = masterPokemon.defaultFormId;
		}
	} else if (masterPokemon.defaultFormId && masterPokemon.defaultFormId === formId) {
		formId = 0;
	}

	return formId ?? 0;
}
