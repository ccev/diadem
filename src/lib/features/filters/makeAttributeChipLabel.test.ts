import { describe, it, expect } from "vitest";
import {
	makeAttributeRangeLabel,
	makeAttributePokemonLabel,
	makeAttributeRaidLevelLabel,
	makeAttributeRaidShowLabel,
	makeAttributeItemLabel
} from "./makeAttributeChipLabel";

describe("makeAttributeRangeLabel", () => {
	it("returns minLabel when min equals max", () => {
		const result = makeAttributeRangeLabel({ min: 5, max: 5 }, 0, 100);
		expect(result).toBe(5);
	});

	it("returns max-only label when min is at minimum bound", () => {
		const result = makeAttributeRangeLabel({ min: 0, max: 50 }, 0, 100);
		expect(result).toContain("50");
	});

	it("returns min-only label when max is at maximum bound", () => {
		const result = makeAttributeRangeLabel({ min: 25, max: 100 }, 0, 100);
		expect(result).toContain("25");
	});

	it("returns full range label for mid-range values", () => {
		const result = makeAttributeRangeLabel({ min: 25, max: 75 }, 0, 100);
		expect(result).toContain("25");
		expect(result).toContain("75");
	});

	it("handles undefined value — returns min bound when min===max (both undefined)", () => {
		// When value is undefined, value?.min === value?.max (both undefined), so returns minLabel
		const result = makeAttributeRangeLabel(undefined, 0, 100);
		expect(result).toBe(0); // minLabel defaults to min bound
	});

	it("accepts custom labels", () => {
		const result = makeAttributeRangeLabel({ min: 1, max: 5 }, 0, 10, "Low", "High");
		expect(result).toContain("Low");
		expect(result).toContain("High");
	});
});

describe("makeAttributePokemonLabel", () => {
	it("returns pokemon name for single pokemon", () => {
		const result = makeAttributePokemonLabel([{ pokemon_id: 25, form: 0 }]);
		expect(result).toContain("25");
	});

	it("returns count for multiple pokemon", () => {
		const result = makeAttributePokemonLabel([
			{ pokemon_id: 25, form: 0 },
			{ pokemon_id: 150, form: 0 }
		]);
		expect(result).toContain("2");
	});
});

describe("makeAttributeRaidLevelLabel", () => {
	it("returns raid name for single level", () => {
		const result = makeAttributeRaidLevelLabel([5]);
		expect(result).toContain("5");
	});

	it("returns count for multiple levels", () => {
		const result = makeAttributeRaidLevelLabel([1, 3, 5]);
		expect(result).toContain("3");
	});
});

describe("makeAttributeRaidShowLabel", () => {
	it("returns egg label", () => {
		const result = makeAttributeRaidShowLabel("egg");
		expect(result).toBe("raid_show_eggs");
	});

	it("returns boss label", () => {
		const result = makeAttributeRaidShowLabel("boss");
		expect(result).toBe("raid_show_bosses");
	});
});

describe("makeAttributeItemLabel", () => {
	it("returns item name for single item", () => {
		const result = makeAttributeItemLabel([{ id: "101" }]);
		expect(result).toContain("101");
	});

	it("returns count for multiple items", () => {
		const result = makeAttributeItemLabel([{ id: "101" }, { id: "102" }]);
		expect(result).toContain("2");
	});
});
