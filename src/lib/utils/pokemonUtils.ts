import { POKEMON_MIN_RANK } from "@/lib/constants";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";

export function hasTimer(data: PokemonData) {
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
	return (
		{
			1: "XXS",
			2: "XS",
			3: "M",
			4: "XL",
			5: "XXL"
		}[size] ?? "?"
	);
}