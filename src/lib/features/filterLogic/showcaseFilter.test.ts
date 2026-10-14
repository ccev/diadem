import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({
	isCurrentSelectedOverwrite: () => false
}));
vi.mock("@/lib/services/userSettings.svelte", () => ({}));
vi.mock("@/lib/utils/pokemonUtils", () => ({ getBestRank: () => undefined, League: {} }));
vi.mock("@/lib/features/filters/icons", () => ({ IconCategory: { POKEMON: "pokemon" } }));
import { shouldDisplayPokemon } from "@/lib/features/filterLogic/pokemon";
import { FiltersetPokemonSchema } from "@/lib/features/filters/filtersetSchemas";
import type { FilterPokemon } from "@/lib/features/filters/filters";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

const base = {
	id: "filter",
	title: { message: "fixture" },
	enabled: true,
	icon: { isUserSelected: false }
};
function filter(showcase?: { trainerId: string; minScore: number }): FilterPokemon {
	return { category: "pokemon", enabled: true, filters: [{ ...base, showcase }] };
}
const pokemon: PokemonData = {
	id: "fixture",
	mapId: "pokemon-fixture",
	type: MapObjectType.POKEMON,
	pokemon_id: 25,
	form: 0,
	lat: 0,
	lon: 0,
	personal_sizes: { owner: { trainerName: "Fixture", height: 1, weight: 1, score: 1100.4 } }
};
describe("showcase score filters", () => {
	it("uses the selected trainer's raw score and does not match unknown scores", () => {
		expect(shouldDisplayPokemon(pokemon, filter({ trainerId: "owner", minScore: 1100.4 }))).toBe(
			true
		);
		expect(shouldDisplayPokemon(pokemon, filter({ trainerId: "owner", minScore: 1100.41 }))).toBe(
			false
		);
		expect(shouldDisplayPokemon(pokemon, filter({ trainerId: "other", minScore: 0 }))).toBe(false);
		expect(
			shouldDisplayPokemon({} as PokemonData, filter({ trainerId: "owner", minScore: 0 }))
		).toBe(false);
	});
	it("preserves ordinary filtersets and OR semantics", () => {
		const mixed = filter({ trainerId: "other", minScore: 1200 });
		mixed.filters.push({ ...base, id: "plain" });
		expect(shouldDisplayPokemon(pokemon, mixed)).toBe(true);
		expect(shouldDisplayPokemon(pokemon, filter())).toBe(true);
	});
	it("retains showcase settings when shared/saved and rejects malformed thresholds", () => {
		const value = { ...base, showcase: { trainerId: "owner", minScore: 1200 } };
		expect(FiltersetPokemonSchema.parse(value).showcase).toEqual(value.showcase);
		for (const minScore of [-1, NaN, Infinity])
			expect(
				FiltersetPokemonSchema.safeParse({ ...value, showcase: { trainerId: "owner", minScore } })
					.success
			).toBe(false);
		expect(
			FiltersetPokemonSchema.safeParse({ ...value, showcase: { trainerId: "", minScore: 0 } })
				.success
		).toBe(false);
	});
});
