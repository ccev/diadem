import { POKEMON_MIN_RANK } from "@/lib/constants";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import * as m from "@/lib/paraglide/messages";

export const pokemonSizes = {
	1: "XXS",
	2: "XS",
	3: "M",
	4: "XL",
	5: "XXL"
};

export function hasTimer(data: {
	expire_timestamp: number | null | undefined;
	expire_timestamp_verified: number | boolean | null | undefined;
}) {
	return data.expire_timestamp && data.expire_timestamp_verified;
}

export function getRank(data: PokemonData, league: "little" | "great" | "ultra") {
	return data.pvp?.[league]?.[0]?.rank ?? 0;
}

export function showLittle(data: PokemonData) {
	return getRank(data, "little") > 0 && getRank(data, "little") <= POKEMON_MIN_RANK;
}

export function showGreat(data: PokemonData) {
	return getRank(data, "great") > 0 && getRank(data, "great") <= POKEMON_MIN_RANK;
}

export function showUltra(data: PokemonData) {
	return getRank(data, "ultra") > 0 && getRank(data, "ultra") <= POKEMON_MIN_RANK;
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
