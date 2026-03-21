import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	generatePokemonFilterDetails,
	getAttributeLabelIvProduct,
	getAttributeLabelIvValues,
	getAttributeLabelSize,
	getAttributeLabelCp,
	getAttributeLabelLevel
} from "./filterUtilsPokemon";
import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";
import { IconCategory } from "@/lib/features/filters/icons";

function makeFilter(overrides: Partial<FiltersetPokemon> = {}): FiltersetPokemon {
	return {
		id: "test-1",
		title: { title: undefined, message: "" },
		enabled: true,
		icon: { isUserSelected: false },
		...overrides
	} as FiltersetPokemon;
}

describe("generatePokemonFilterDetails", () => {
	describe("title generation", () => {
		it("uses generic 'Pokémon' kind when no pokemon set", () => {
			const filter = makeFilter();
			generatePokemonFilterDetails(filter);
			// No pokemon → kind is pogo_pokemon(), message stays fallback
			expect(filter.title.message).toBe("filter_template_pokemon_fallback");
		});

		it("uses pokemon name for single pokemon", () => {
			const filter = makeFilter({ pokemon: [{ pokemon_id: 25, form: 0 }] });
			generatePokemonFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_pokemon_template");
			expect(filter.title.params?.kind).toBe("pokemon:25:0");
		});

		it("uses base name when all pokemon have same base ID", () => {
			const filter = makeFilter({
				pokemon: [
					{ pokemon_id: 25, form: 0 },
					{ pokemon_id: 25, form: 1 }
				]
			});
			generatePokemonFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_pokemon_template");
			// base name: mPokemon({ pokemon_id: 25 }) → "pokemon:25:0" (form defaults to 0)
			expect(filter.title.params?.kind).toContain("pokemon:25");
		});

		it("uses count label for multiple different pokemon", () => {
			const filter = makeFilter({
				pokemon: [
					{ pokemon_id: 25, form: 0 },
					{ pokemon_id: 150, form: 0 }
				]
			});
			generatePokemonFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_pokemon_template");
			expect(filter.title.params?.kind).toBe("count_pokemon(count:2)");
		});

		it("includes IV attribute in title", () => {
			const filter = makeFilter({ iv: { min: 90, max: 100 } });
			generatePokemonFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_pokemon_template");
			expect(filter.title.params?.attributes).toBeTruthy();
		});

		it("joins multiple attributes with ' & '", () => {
			const filter = makeFilter({
				iv: { min: 90, max: 100 },
				cp: { min: 1000, max: 5000 }
			});
			generatePokemonFilterDetails(filter);
			expect(filter.title.params?.attributes).toContain(" & ");
		});

		it("includes PVP rank attributes", () => {
			const filter = makeFilter({
				pvpRankGreat: { min: 1, max: 10 }
			});
			generatePokemonFilterDetails(filter);
			expect(filter.title.params?.attributes).toBeTruthy();
		});

		it("includes IV values (atk/def/sta) attribute", () => {
			const filter = makeFilter({
				ivAtk: { min: 15, max: 15 }
			});
			generatePokemonFilterDetails(filter);
			expect(filter.title.params?.attributes).toBeTruthy();
		});

		it("includes size attribute", () => {
			const filter = makeFilter({
				size: { min: 1, max: 2 }
			});
			generatePokemonFilterDetails(filter);
			expect(filter.title.params?.attributes).toBeTruthy();
		});

		it("includes level attribute", () => {
			const filter = makeFilter({
				level: { min: 30, max: 50 }
			});
			generatePokemonFilterDetails(filter);
			expect(filter.title.params?.attributes).toBeTruthy();
		});
	});

	describe("icon assignment", () => {
		it("sets pokemon icon for single pokemon", () => {
			const filter = makeFilter({ pokemon: [{ pokemon_id: 25, form: 0 }] });
			generatePokemonFilterDetails(filter);
			expect(filter.icon.uicon?.category).toBe(IconCategory.POKEMON);
			expect(filter.icon.uicon?.params).toEqual({ pokemon_id: 25, form: 0 });
		});

		it("sets hundo emoji for IV >= 98", () => {
			const filter = makeFilter({ iv: { min: 98, max: 100 } });
			generatePokemonFilterDetails(filter);
			expect(filter.icon.emoji).toBe("💯");
		});

		it("sets hundo emoji when individual IVs sum to 45", () => {
			const filter = makeFilter({
				ivAtk: { min: 15, max: 15 },
				ivDef: { min: 15, max: 15 },
				ivSta: { min: 15, max: 15 }
			});
			generatePokemonFilterDetails(filter);
			expect(filter.icon.emoji).toBe("💯");
		});

		it("sets nundo emoji for IV max=0", () => {
			const filter = makeFilter({ iv: { min: 0, max: 0 } });
			generatePokemonFilterDetails(filter);
			expect(filter.icon.emoji).toBe("🗑️");
		});

		it("sets nundo emoji when individual IVs max sum to 0", () => {
			const filter = makeFilter({
				ivAtk: { min: 0, max: 0 },
				ivDef: { min: 0, max: 0 },
				ivSta: { min: 0, max: 0 }
			});
			generatePokemonFilterDetails(filter);
			expect(filter.icon.emoji).toBe("🗑️");
		});

		it("sets ultra ball icon for IV >= 85", () => {
			const filter = makeFilter({ iv: { min: 85, max: 100 } });
			generatePokemonFilterDetails(filter);
			expect(filter.icon.uicon?.category).toBe(IconCategory.ITEM);
			expect(filter.icon.uicon?.params).toEqual({ item: 3 });
		});

		it("sets great ball icon for IV >= 50", () => {
			const filter = makeFilter({ iv: { min: 50, max: 84 } });
			generatePokemonFilterDetails(filter);
			expect(filter.icon.uicon?.category).toBe(IconCategory.ITEM);
			expect(filter.icon.uicon?.params).toEqual({ item: 2 });
		});

		it("sets little league icon for pvpRankLittle", () => {
			const filter = makeFilter({ pvpRankLittle: { min: 1, max: 50 } });
			generatePokemonFilterDetails(filter);
			expect(filter.icon.uicon?.category).toBe(IconCategory.LEAGUE);
		});

		it("sets great league icon for pvpRankGreat", () => {
			const filter = makeFilter({ pvpRankGreat: { min: 1, max: 50 } });
			generatePokemonFilterDetails(filter);
			expect(filter.icon.uicon?.category).toBe(IconCategory.LEAGUE);
		});

		it("sets ultra league icon for pvpRankUltra", () => {
			const filter = makeFilter({ pvpRankUltra: { min: 1, max: 50 } });
			generatePokemonFilterDetails(filter);
			expect(filter.icon.uicon?.category).toBe(IconCategory.LEAGUE);
		});

		it("sets elephant emoji for large size filter", () => {
			const filter = makeFilter({ size: { min: 4, max: 5 } });
			generatePokemonFilterDetails(filter);
			expect(filter.icon.emoji).toBe("🐘");
		});

		it("sets pinch emoji for small size filter", () => {
			const filter = makeFilter({ size: { min: 1, max: 2 } });
			generatePokemonFilterDetails(filter);
			expect(filter.icon.emoji).toBe("🤏");
		});

		it("sets ruler emoji for mixed size filter", () => {
			const filter = makeFilter({ size: { min: 2, max: 4 } });
			generatePokemonFilterDetails(filter);
			expect(filter.icon.emoji).toBe("📏");
		});

		it("does not override user-selected icon", () => {
			const filter = makeFilter({
				iv: { min: 100, max: 100 },
				icon: { isUserSelected: true, emoji: "⭐" } as any
			});
			generatePokemonFilterDetails(filter);
			expect(filter.icon.emoji).toBe("⭐");
		});

		it("sets base pokemon icon when all pokemon share same base ID", () => {
			const filter = makeFilter({
				pokemon: [
					{ pokemon_id: 25, form: 0 },
					{ pokemon_id: 25, form: 1 }
				]
			});
			generatePokemonFilterDetails(filter);
			expect(filter.icon.uicon?.category).toBe(IconCategory.POKEMON);
			expect(filter.icon.uicon?.params).toEqual({ pokemon_id: 25 });
		});

		it("sets first pokemon icon for multiple different pokemon", () => {
			const filter = makeFilter({
				pokemon: [
					{ pokemon_id: 25, form: 0 },
					{ pokemon_id: 150, form: 0 }
				]
			});
			generatePokemonFilterDetails(filter);
			expect(filter.icon.uicon?.category).toBe(IconCategory.POKEMON);
			expect(filter.icon.uicon?.params).toEqual({ pokemon_id: 25, form: 0 });
		});

		it("sets pokeball icon as fallback", () => {
			const filter = makeFilter();
			generatePokemonFilterDetails(filter);
			expect(filter.icon.uicon?.category).toBe(IconCategory.ITEM);
			expect(filter.icon.uicon?.params).toEqual({ item: 1 });
		});
	});
});

describe("getAttributeLabelIvProduct", () => {
	it("returns range label for IV product", () => {
		const result = getAttributeLabelIvProduct({ min: 90, max: 100 });
		expect(result).toBeTruthy();
	});
});

describe("getAttributeLabelIvValues", () => {
	it("returns range label for individual IVs", () => {
		const result = getAttributeLabelIvValues(
			{ min: 10, max: 15 },
			{ min: 10, max: 15 },
			{ min: 10, max: 15 }
		);
		expect(result).toBeTruthy();
	});

	it("handles undefined IV values", () => {
		const result = getAttributeLabelIvValues(undefined, undefined, undefined);
		expect(result).toBeTruthy();
	});
});

describe("getAttributeLabelSize", () => {
	it("returns label for size range", () => {
		const result = getAttributeLabelSize({ min: 1, max: 3 });
		expect(result).toBeTruthy();
	});
});

describe("getAttributeLabelCp", () => {
	it("returns label for CP range", () => {
		const result = getAttributeLabelCp({ min: 1000, max: 3000 });
		expect(result).toBeTruthy();
	});
});

describe("getAttributeLabelLevel", () => {
	it("returns label for level range", () => {
		const result = getAttributeLabelLevel({ min: 20, max: 40 });
		expect(result).toBeTruthy();
	});
});
