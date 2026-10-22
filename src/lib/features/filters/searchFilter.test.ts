import { describe, expect, it } from "vitest";
import { resolveSearchFilter } from "./searchFilter";
import type { FilterGym, FilterPokemon, FilterPokestop, FilterStation } from "./filters";
import type { FiltersetPokemon } from "./filtersets";

const filterset: FiltersetPokemon = {
	id: "saved",
	enabled: false,
	title: { title: "Hundos" },
	icon: { isUserSelected: false },
	iv: { min: 100, max: 100 }
} as FiltersetPokemon;

describe("resolveSearchFilter", () => {
	it("overrides enabled flags without changing the saved filterset", () => {
		const saved: FilterPokemon = {
			category: "pokemon",
			enabled: false,
			filters: [filterset, { ...filterset, id: "other" }]
		};
		const snapshot = structuredClone(saved);
		const focused = resolveSearchFilter(saved, filterset) as FilterPokemon;
		expect(focused.enabled).toBe(true);
		expect(focused.filters).toEqual([{ ...filterset, enabled: true }]);
		expect(focused.filters[0].title).toBe(filterset.title);
		expect(focused.filters[0].iv).toBe(filterset.iv);
		expect(saved).toEqual(snapshot);
	});
	it("uses the supplied filterset's constraints rather than a deep copy", () => {
		const selected = { ...filterset, iv: { min: 100, max: 100 } };
		const saved: FilterPokemon = { category: "pokemon", enabled: false, filters: [selected] };
		const focused = resolveSearchFilter(saved, selected) as FilterPokemon;
		selected.iv.min = 90;
		expect(focused.filters[0].iv).toEqual({ min: 90, max: 100 });
		expect(focused.filters[0].enabled).toBe(true);
		expect(selected.enabled).toBe(false);
		expect(saved.enabled).toBe(false);
	});
	it.each([
		{ category: "gym", selected: "raid", siblings: ["gymPlain"] },
		{
			category: "pokestop",
			selected: "quest",
			siblings: ["pokestopPlain", "invasion", "lure", "kecleon", "goldPokestop", "contest"]
		},
		{ category: "station", selected: "maxBattle", siblings: ["stationPlain"] }
	] as const)(
		"turns off all sibling categories for $category",
		({ category, selected, siblings }) => {
			const saved = {
				category,
				enabled: false,
				filters: [],
				...Object.fromEntries(
					[selected, ...siblings].map((key) => [
						key,
						{ category: key, enabled: true, filters: [{ ...filterset }] }
					])
				)
			} as unknown as FilterGym | FilterPokestop | FilterStation;
			const snapshot = structuredClone(saved);
			const focused = resolveSearchFilter(saved, filterset, selected);
			expect(focused.enabled).toBe(true);
			for (const [key, value] of Object.entries(focused)) {
				if (!value || typeof value !== "object" || !("enabled" in value)) continue;
				expect(value.enabled).toBe(key === selected);
				expect(value.filters).toHaveLength(key === selected ? 1 : 0);
				if (key === selected) {
					expect(value.filters).toEqual([{ ...filterset, enabled: true }]);
					expect(value.filters[0].title).toBe(filterset.title);
				}
			}
			expect(saved).toEqual(snapshot);
		}
	);
});
