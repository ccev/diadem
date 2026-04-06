import type { MinMax } from "@/lib/features/filters/filtersets";

export type GolbatPokemonSpecies = { id: number; form?: number };

export type GolbatPokemonQuery = {
	pokemon?: GolbatPokemonSpecies[];
	iv?: MinMax;
	atk_iv?: MinMax;
	def_iv?: MinMax;
	sta_iv?: MinMax;
	level?: MinMax;
	cp?: MinMax;
	gender?: number[];
	size?: MinMax;
	pvp_little?: MinMax;
	pvp_great?: MinMax;
	pvp_ultra?: MinMax;
};
