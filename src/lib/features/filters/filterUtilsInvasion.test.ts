import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	makeAttributeCharacterLabel,
	generateInvasionFilterDetails
} from "./filterUtilsInvasion";
import type { FiltersetInvasion } from "@/lib/features/filters/filtersets";
import { IconCategory } from "@/lib/features/filters/icons";

function makeFilter(overrides: Partial<FiltersetInvasion> = {}): FiltersetInvasion {
	return {
		id: "test-invasion-1",
		title: { title: undefined, message: "" },
		enabled: true,
		icon: { isUserSelected: false },
		...overrides
	} as FiltersetInvasion;
}

describe("makeAttributeCharacterLabel", () => {
	it("returns character name for single character", () => {
		const result = makeAttributeCharacterLabel([4]);
		expect(result).toBe("character:4");
	});

	it("returns Giovanni name for [44, 46] pair", () => {
		const result = makeAttributeCharacterLabel([44, 46]);
		expect(result).toBe("character:44");
	});

	it("returns count_leaders for all leaders", () => {
		const result = makeAttributeCharacterLabel([41, 42, 43, 44, 46]);
		expect(result).toBe("count_leaders(count:5)");
	});

	it("returns count_leaders for subset of leaders", () => {
		const result = makeAttributeCharacterLabel([41, 42]);
		expect(result).toBe("count_leaders(count:2)");
	});

	it("returns count_characters for mixed characters", () => {
		const result = makeAttributeCharacterLabel([4, 10, 20]);
		expect(result).toBe("count_characters(count:3)");
	});
});

describe("generateInvasionFilterDetails", () => {
	it("sets fallback title and default grunt icon when no characters", () => {
		const filter = makeFilter();
		generateInvasionFilterDetails(filter);
		expect(filter.title.message).toBe("filter_template_invasion_fallback");
		expect(filter.icon.uicon?.category).toBe(IconCategory.INVASION);
		expect(filter.icon.uicon?.params?.character).toBe(4);
	});

	it("sets character name directly for single leader", () => {
		const filter = makeFilter({ characters: [41] });
		generateInvasionFilterDetails(filter);
		expect(filter.title.message).toBe("character:41");
		expect(filter.icon.uicon?.params?.character).toBe(41);
	});

	it("sets character name directly for single no-type character (4 or 5)", () => {
		const filter = makeFilter({ characters: [4] });
		generateInvasionFilterDetails(filter);
		expect(filter.title.message).toBe("character:4");
		expect(filter.icon.uicon?.params?.character).toBe(4);
	});

	it("sets grunt template for single typed grunt", () => {
		const filter = makeFilter({ characters: [10] });
		generateInvasionFilterDetails(filter);
		expect(filter.title.message).toBe("filter_template_invasion_one_grunt");
		expect(filter.title.params?.type).toBe("character:10");
		expect(filter.icon.uicon?.params?.character).toBe(10);
	});

	it("sets giovanni template for [44, 46]", () => {
		const filter = makeFilter({ characters: [44, 46] });
		generateInvasionFilterDetails(filter);
		expect(filter.title.message).toBe("filter_template_invasion_giovanni");
		expect(filter.icon.uicon?.params?.character).toBe(44);
	});

	it("sets count_leaders for multiple leaders", () => {
		const filter = makeFilter({ characters: [41, 42, 43] });
		generateInvasionFilterDetails(filter);
		expect(filter.title.message).toBe("count_leaders");
		expect(filter.title.params?.count).toBe("3");
	});

	it("sets count_characters for mixed characters", () => {
		const filter = makeFilter({ characters: [4, 10, 20, 30] });
		generateInvasionFilterDetails(filter);
		expect(filter.title.message).toBe("count_characters");
		expect(filter.title.params?.count).toBe("4");
	});

	it("sets icon to first character in list for multiple characters", () => {
		const filter = makeFilter({ characters: [41, 42, 43] });
		generateInvasionFilterDetails(filter);
		expect(filter.icon.uicon?.category).toBe(IconCategory.INVASION);
		expect(filter.icon.uicon?.params?.character).toBe(41);
	});

	it("does not override user-selected icon", () => {
		const filter = makeFilter({
			characters: [41],
			icon: { isUserSelected: true, emoji: "🔥" } as any
		});
		generateInvasionFilterDetails(filter);
		expect(filter.icon.emoji).toBe("🔥");
	});

	it("preserves user-set title", () => {
		const filter = makeFilter({ characters: [41] });
		filter.title.title = "My Custom Title";
		generateInvasionFilterDetails(filter);
		expect(filter.title.title).toBe("My Custom Title");
	});
});
