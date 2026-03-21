import { describe, it, expect, vi } from "vitest";
import { getIcon, IconCategory, IconFeature } from "./icons";
import { getIconPokemon, getIconRaidEgg, getIconItem, getIconLeague, getIconInvasion } from "@/lib/services/uicons.svelte";

describe("getIcon", () => {
	it("dispatches POKEMON to getIconPokemon", () => {
		const params = { pokemon_id: 25, form: 0 };
		getIcon(IconCategory.POKEMON, params);
		expect(getIconPokemon).toHaveBeenCalledWith(params);
	});

	it("dispatches RAID to getIconRaidEgg with level and hatched", () => {
		getIcon(IconCategory.RAID, { level: 5, hatched: true });
		expect(getIconRaidEgg).toHaveBeenCalledWith(5, true);
	});

	it("dispatches RAID with defaults when params missing", () => {
		getIcon(IconCategory.RAID, {});
		expect(getIconRaidEgg).toHaveBeenCalledWith(0, false);
	});

	it("dispatches ITEM to getIconItem with item and amount", () => {
		getIcon(IconCategory.ITEM, { item: 1, amount: 3 });
		expect(getIconItem).toHaveBeenCalledWith(1, 3);
	});

	it("dispatches LEAGUE to getIconLeague", () => {
		getIcon(IconCategory.LEAGUE, { league: 1500 });
		expect(getIconLeague).toHaveBeenCalledWith(1500);
	});

	it("dispatches INVASION to getIconInvasion", () => {
		getIcon(IconCategory.INVASION, { character: 42 });
		expect(getIconInvasion).toHaveBeenCalledWith(42, true);
	});

	it("dispatches FEATURES with IconFeature.LEAGUE to getIconLeague", () => {
		getIcon(IconCategory.FEATURES, { feature: IconFeature.LEAGUE, league: 2500 });
		expect(getIconLeague).toHaveBeenCalledWith(2500);
	});

	it("falls back to pokemon icon for unknown category", () => {
		const result = getIcon(IconCategory.GYM, {});
		expect(getIconPokemon).toHaveBeenCalledWith({ pokemon_id: 0 });
		expect(result).toBe("icon-pokemon");
	});
});
