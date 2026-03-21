import { describe, it, expect } from "vitest";
import {
	FiltersetPokemonSchema,
	FiltersetQuestSchema,
	FiltersetRaidSchema,
	FiltersetInvasionSchema,
	FiltersetLureSchema,
	FiltersetGymPlainSchema,
	FiltersetS2CellSchema,
	FiltersetMaxBattleSchema
} from "./filtersetSchemas";

// Mock the icons module
vi.mock("@/lib/features/filters/icons", () => ({
	IconCategory: {
		POKEMON: "pokemon",
		GYM: "gym",
		POKESTOP: "pokestop",
		ITEM: "item",
		TYPE: "type",
		RAID: "raid",
		INVASION: "invasion",
		QUEST: "quest",
		CONTEST: "contest",
		STATION: "station",
		NEST: "nest",
		LURE: "lure",
		GENERIC: "generic",
		TEAM: "team"
	}
}));

import { vi } from "vitest";

function makeBaseFilterset(overrides: Record<string, any> = {}) {
	return {
		id: "test-1",
		title: { message: "test_filter" },
		enabled: true,
		icon: { isUserSelected: false },
		...overrides
	};
}

describe("FiltersetPokemonSchema", () => {
	it("validates a minimal pokemon filterset", () => {
		const result = FiltersetPokemonSchema.safeParse(makeBaseFilterset());
		expect(result.success).toBe(true);
	});

	it("validates with all optional pokemon fields", () => {
		const result = FiltersetPokemonSchema.safeParse(makeBaseFilterset({
			pokemon: [{ pokemon_id: 25, form: 0 }],
			iv: { min: 90, max: 100 },
			cp: { min: 1000, max: 5000 },
			level: { min: 1, max: 50 },
			gender: [1, 2],
			size: { min: 1, max: 5 },
			pvpRankLittle: { min: 1, max: 100 },
			pvpRankGreat: { min: 1, max: 100 },
			pvpRankUltra: { min: 1, max: 100 }
		}));
		expect(result.success).toBe(true);
	});

	it("rejects invalid pokemon data", () => {
		const result = FiltersetPokemonSchema.safeParse(makeBaseFilterset({
			pokemon: [{ invalid: true }]
		}));
		expect(result.success).toBe(false);
	});

	it("rejects missing required fields", () => {
		const result = FiltersetPokemonSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

describe("FiltersetQuestSchema", () => {
	it("validates a minimal quest filterset", () => {
		const result = FiltersetQuestSchema.safeParse(makeBaseFilterset());
		expect(result.success).toBe(true);
	});

	it("validates with quest-specific fields", () => {
		const result = FiltersetQuestSchema.safeParse(makeBaseFilterset({
			ar: "ar",
			pokemon: [{ pokemon_id: 25, form: 0 }],
			item: [{ id: "101" }],
			stardust: { min: 100, max: 1000 },
			xp: { min: 500, max: 5000 }
		}));
		expect(result.success).toBe(true);
	});

	it("rejects invalid ar value", () => {
		const result = FiltersetQuestSchema.safeParse(makeBaseFilterset({
			ar: "invalid"
		}));
		expect(result.success).toBe(false);
	});
});

describe("FiltersetRaidSchema", () => {
	it("validates a minimal raid filterset", () => {
		const result = FiltersetRaidSchema.safeParse(makeBaseFilterset());
		expect(result.success).toBe(true);
	});

	it("validates with raid-specific fields", () => {
		const result = FiltersetRaidSchema.safeParse(makeBaseFilterset({
			levels: [1, 3, 5],
			bosses: [{ pokemon_id: 150, form: 0 }],
			show: ["egg", "boss"]
		}));
		expect(result.success).toBe(true);
	});

	it("rejects invalid show value", () => {
		const result = FiltersetRaidSchema.safeParse(makeBaseFilterset({
			show: ["invalid"]
		}));
		expect(result.success).toBe(false);
	});
});

describe("FiltersetInvasionSchema", () => {
	it("validates with characters and rewards", () => {
		const result = FiltersetInvasionSchema.safeParse(makeBaseFilterset({
			characters: [4, 5, 41],
			rewards: [{ pokemon_id: 25, form: 0 }]
		}));
		expect(result.success).toBe(true);
	});
});

describe("FiltersetLureSchema", () => {
	it("requires items array", () => {
		const result = FiltersetLureSchema.safeParse(makeBaseFilterset());
		expect(result.success).toBe(false);
	});

	it("validates with items", () => {
		const result = FiltersetLureSchema.safeParse(makeBaseFilterset({
			items: [501, 502, 503]
		}));
		expect(result.success).toBe(true);
	});
});

describe("FiltersetGymPlainSchema", () => {
	it("validates with gym-specific fields", () => {
		const result = FiltersetGymPlainSchema.safeParse(makeBaseFilterset({
			isSponsored: true,
			powerUpLevel: { min: 0, max: 3 },
			defenderAmount: { min: 0, max: 6 }
		}));
		expect(result.success).toBe(true);
	});
});

describe("FiltersetMaxBattleSchema", () => {
	it("validates with max battle fields", () => {
		const result = FiltersetMaxBattleSchema.safeParse(makeBaseFilterset({
			levels: [1, 2, 3],
			bosses: [{ pokemon_id: 25, form: 0 }],
			isActive: true,
			hasGmax: false
		}));
		expect(result.success).toBe(true);
	});
});

describe("FiltersetS2CellSchema", () => {
	it("validates with optional level", () => {
		const result = FiltersetS2CellSchema.safeParse(makeBaseFilterset({
			level: 14
		}));
		expect(result.success).toBe(true);
	});
});
