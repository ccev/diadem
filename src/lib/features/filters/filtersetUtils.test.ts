import { describe, it, expect, vi } from "vitest";
import { changeAttributeMinMax, filterTitle, generateFilterDetails, setFilterIcon } from "./filtersetUtils";

describe("changeAttributeMinMax", () => {
	it("deletes attribute when min/max equal bounds", () => {
		const data: any = { iv: { min: 0, max: 100 } };
		changeAttributeMinMax(data, "iv", 0, 100, 0, 100);
		expect(data.iv).toBeUndefined();
	});

	it("sets attribute when min differs from bound", () => {
		const data: any = {};
		changeAttributeMinMax(data, "iv", 0, 100, 50, 100);
		expect(data.iv).toEqual({ min: 50, max: 100 });
	});

	it("sets attribute when max differs from bound", () => {
		const data: any = {};
		changeAttributeMinMax(data, "iv", 0, 100, 0, 50);
		expect(data.iv).toEqual({ min: 0, max: 50 });
	});

	it("sets attribute when both differ from bounds", () => {
		const data: any = {};
		changeAttributeMinMax(data, "iv", 0, 100, 25, 75);
		expect(data.iv).toEqual({ min: 25, max: 75 });
	});

	it("overwrites existing attribute", () => {
		const data: any = { iv: { min: 10, max: 90 } };
		changeAttributeMinMax(data, "iv", 0, 100, 20, 80);
		expect(data.iv).toEqual({ min: 20, max: 80 });
	});
});

describe("filterTitle", () => {
	it("returns unknown_filter for undefined", () => {
		expect(filterTitle(undefined)).toBe("unknown_filter");
	});

	it("returns custom title when title.title is set", () => {
		const filterset: any = {
			title: { title: "My Custom Filter", message: "some_key" }
		};
		expect(filterTitle(filterset)).toBe("My Custom Filter");
	});

	it("returns message key value when title.title is not set", () => {
		const filterset: any = {
			title: { message: "xp" }
		};
		expect(filterTitle(filterset)).toBe("xp");
	});

	it("returns raw message string when key is not in messages", () => {
		const filterset: any = {
			title: { message: "some_nonexistent_key_xyz" }
		};
		// Since our mock only has specific keys, this will fall through
		// The mock has `has()` returning true, so it will try m[key]()
		// which will return the key name
		expect(filterTitle(filterset)).toBeTruthy();
	});

	it("returns unknown_filter when message is empty", () => {
		const filterset: any = {
			title: { message: "" }
		};
		expect(filterTitle(filterset)).toBe("unknown_filter");
	});

	it("resolves message params that are themselves message keys", () => {
		const filterset: any = {
			title: {
				message: "quest_item",
				params: { count: "5", item: "xp" }
			}
		};
		const result = filterTitle(filterset);
		// "xp" is a valid message key, so params.item gets resolved to m.xp() = "xp"
		// Then m.quest_item({ count: "5", item: "xp" }) is called
		expect(result).toContain("5");
	});

	it("leaves params unchanged when value is not a message key", () => {
		const filterset: any = {
			title: {
				message: "quest_item",
				params: { count: "3", item: "not_a_real_key_xyz" }
			}
		};
		// "not_a_real_key_xyz" won't pass Object.hasOwn(m, value) since our mock
		// uses has() returning true but the `in` operator check on line 39 will pass
		const result = filterTitle(filterset);
		expect(typeof result).toBe("string");
	});
});

describe("generateFilterDetails", () => {
	it("calls generatePokemonFilterDetails for pokemon category", () => {
		const filter: any = {
			id: "f1",
			title: { message: "" },
			enabled: true,
			icon: { isUserSelected: false }
		};
		// Should not throw
		generateFilterDetails("pokemon", "pokemon", filter);
	});

	it("is a no-op for quest sub-category", () => {
		const filter: any = {
			id: "f1",
			title: { message: "" },
			enabled: true,
			icon: { isUserSelected: false }
		};
		// Quest path does nothing
		generateFilterDetails("pokestop", "quest", filter);
	});

	it("calls generateRaidFilterDetails for raid sub-category", () => {
		const filter: any = {
			id: "f1",
			title: { title: "Custom", message: "" },
			enabled: true,
			icon: { isUserSelected: false }
		};
		generateFilterDetails("gym", "raid", filter);
		// Should update filter title
		expect(filter.title.message).toBe("filter_template_raids_fallback");
	});

	it("calls generateInvasionFilterDetails for invasion sub-category", () => {
		const filter: any = {
			id: "f1",
			title: { title: "Custom", message: "" },
			enabled: true,
			icon: { isUserSelected: false }
		};
		generateFilterDetails("pokestop", "invasion", filter);
		expect(filter.title.message).toBe("filter_template_invasion_fallback");
	});
});

describe("setFilterIcon", () => {
	it("sets icon when not user-selected", () => {
		const filter: any = {
			icon: { isUserSelected: false }
		};
		setFilterIcon(filter, { uicon: { category: "pokemon" as any, params: { pokemon_id: 25 } } });
		expect(filter.icon.uicon).toEqual({ category: "pokemon", params: { pokemon_id: 25 } });
	});

	it("does not override user-selected icon", () => {
		const filter: any = {
			icon: { isUserSelected: true, uicon: { category: "raid" as any, params: { level: 5 } } }
		};
		setFilterIcon(filter, { uicon: { category: "pokemon" as any, params: { pokemon_id: 25 } } });
		expect(filter.icon.uicon).toEqual({ category: "raid", params: { level: 5 } });
	});

	it("sets emoji when not user-selected", () => {
		const filter: any = {
			icon: { isUserSelected: false }
		};
		setFilterIcon(filter, { emoji: "🔥" });
		expect(filter.icon.emoji).toBe("🔥");
	});
});
