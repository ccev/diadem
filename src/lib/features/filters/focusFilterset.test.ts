import { describe, expect, it } from "vitest";
import { focusFilterset } from "./focusFilterset";
import type { FilterGym, FilterPokemon, FilterPokestop, FilterStation } from "./filters";
import type { FiltersetPokemon } from "./filtersets";

const filterset: FiltersetPokemon = {
	id: "saved",
	enabled: false,
	title: { title: "Hundos" },
	icon: { isUserSelected: false },
	iv: { min: 100, max: 100 }
} as FiltersetPokemon;

describe("focusFilterset", () => {
	it("enables only a detached copy of the chosen filterset", () => {
		const saved: FilterPokemon = {
			category: "pokemon",
			enabled: false,
			filters: [filterset, { ...filterset, id: "other" }]
		};
		const snapshot = structuredClone(saved);
		const focused = focusFilterset(saved, filterset) as FilterPokemon;
		expect(focused.enabled).toBe(true);
		expect(focused.filters).toEqual([{ ...filterset, enabled: true }]);
		focused.filters[0].title.title = "Edited search";
		expect(saved).toEqual(snapshot);
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
			const focused = focusFilterset(saved, filterset, selected);
			expect(focused.enabled).toBe(true);
			for (const [key, value] of Object.entries(focused)) {
				if (!value || typeof value !== "object" || !("enabled" in value)) continue;
				expect(value.enabled).toBe(key === selected);
				expect(value.filters).toHaveLength(key === selected ? 1 : 0);
			}
			expect(saved).toEqual(snapshot);
		}
	);
});
