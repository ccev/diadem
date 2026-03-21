import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateRaidFilterDetails } from "./filterUtilsRaid";
import type { FiltersetRaid } from "@/lib/features/filters/filtersets";
import { RaidLevel } from "@/lib/utils/gymUtils";
import { IconCategory } from "@/lib/features/filters/icons";

function makeFilter(overrides: Partial<FiltersetRaid> = {}): FiltersetRaid {
	return {
		id: "test-raid-1",
		title: { title: undefined, message: "" },
		enabled: true,
		icon: { isUserSelected: false },
		...overrides
	} as FiltersetRaid;
}

describe("generateRaidFilterDetails", () => {
	describe("default/fallback", () => {
		it("sets fallback title and default raid icon when no filters", () => {
			const filter = makeFilter();
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_raids_fallback");
			expect(filter.icon.uicon?.category).toBe(IconCategory.RAID);
		});
	});

	describe("level filters", () => {
		it("sets specific message for single level - STAR_1", () => {
			const filter = makeFilter({ levels: [RaidLevel.STAR_1] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_levels_1_star");
		});

		it("sets specific message for SHADOW_STAR_1", () => {
			const filter = makeFilter({ levels: [RaidLevel.SHADOW_STAR_1] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_levels_1_star_shadow");
		});

		it("sets specific message for STAR_3", () => {
			const filter = makeFilter({ levels: [RaidLevel.STAR_3] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_levels_3_star");
		});

		it("sets specific message for SHADOW_STAR_3", () => {
			const filter = makeFilter({ levels: [RaidLevel.SHADOW_STAR_3] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_levels_3_star_shadow");
		});

		it("sets specific message for LEGENDARY", () => {
			const filter = makeFilter({ levels: [RaidLevel.LEGENDARY] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_levels_legendary");
		});

		it("sets specific message for SHADOW_LEGENDARY", () => {
			const filter = makeFilter({ levels: [RaidLevel.SHADOW_LEGENDARY] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_levels_legendary_shadow");
		});

		it("sets specific message for MEGA", () => {
			const filter = makeFilter({ levels: [RaidLevel.MEGA] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_levels_mega");
		});

		it("sets specific message for MEGA_LEGENDARY", () => {
			const filter = makeFilter({ levels: [RaidLevel.MEGA_LEGENDARY] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_levels_mega_legendary");
		});

		it("sets specific message for PRIMAL", () => {
			const filter = makeFilter({ levels: [RaidLevel.PRIMAL] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_levels_primal");
		});

		it("sets specific message for ULTRA_BEAST", () => {
			const filter = makeFilter({ levels: [RaidLevel.ULTRA_BEAST] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_levels_ultra_beast");
		});

		it("sets specific message for ELITE", () => {
			const filter = makeFilter({ levels: [RaidLevel.ELITE] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_levels_elite");
		});

		it("sets 'various' message for multiple levels", () => {
			const filter = makeFilter({ levels: [RaidLevel.STAR_1, RaidLevel.STAR_3] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_levels_various");
		});

		it("sets raid icon with first level for multiple levels", () => {
			const filter = makeFilter({ levels: [RaidLevel.STAR_3, RaidLevel.LEGENDARY] });
			generateRaidFilterDetails(filter);
			expect(filter.icon.uicon?.category).toBe(IconCategory.RAID);
			expect(filter.icon.uicon?.params?.level).toBe(RaidLevel.STAR_3);
		});
	});

	describe("show filter", () => {
		it("sets egg kind when show includes 'egg'", () => {
			const filter = makeFilter({ levels: [RaidLevel.STAR_1], show: ["egg"] });
			generateRaidFilterDetails(filter);
			expect(filter.title.params?.kind).toBe("filter_template_raids_eggs");
		});

		it("sets boss kind when show includes 'boss'", () => {
			const filter = makeFilter({ levels: [RaidLevel.STAR_1], show: ["boss"] });
			generateRaidFilterDetails(filter);
			expect(filter.title.params?.kind).toBe("filter_template_raids_bosses");
			// Note: the single-level branch overwrites the icon after boss sets hatched
			expect(filter.icon.uicon?.category).toBe(IconCategory.RAID);
		});

		it("sets 'all' message when show is set but no levels", () => {
			const filter = makeFilter({ show: ["egg"] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_raids_all");
		});
	});

	describe("boss filters", () => {
		it("sets pokemon name and icon for single boss", () => {
			const filter = makeFilter({ bosses: [{ pokemon_id: 150, form: 0 }] });
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("filter_template_pokemon_raids");
			expect(filter.title.params?.pokemon).toBe("pokemon:150:0");
			expect(filter.icon.uicon?.category).toBe(IconCategory.POKEMON);
		});

		it("sets count title for multiple bosses", () => {
			const filter = makeFilter({
				bosses: [
					{ pokemon_id: 150, form: 0 },
					{ pokemon_id: 151, form: 0 }
				]
			});
			generateRaidFilterDetails(filter);
			expect(filter.title.message).toBe("count_pokemon");
			expect(filter.title.params?.count).toBe(2);
		});

		it("sets hatched raid icon for multiple bosses", () => {
			const filter = makeFilter({
				bosses: [
					{ pokemon_id: 150, form: 0 },
					{ pokemon_id: 151, form: 0 }
				]
			});
			generateRaidFilterDetails(filter);
			expect(filter.icon.uicon?.category).toBe(IconCategory.RAID);
			expect(filter.icon.uicon?.params?.hatched).toBe(1);
		});
	});

	it("returns the filter", () => {
		const filter = makeFilter();
		const result = generateRaidFilterDetails(filter);
		expect(result).toBe(filter);
	});
});
