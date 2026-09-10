import type { GolbatPokestopResult } from "@/lib/server/api/golbat/types";
import { mapPokestop } from "@/lib/server/queryMapObjects/fortApiMapping";
import { describe, expect, it } from "vitest";

const pokestop = {
	id: "stop-1",
	lat: 1,
	lon: 2,
	deleted: false,
	updated: 100,
	first_seen_timestamp: 50,
	quests: []
} satisfies GolbatPokestopResult;

describe("mapPokestop", () => {
	it("re-serializes native-JSON quest rewards to the SQL string shape", () => {
		const mapped = mapPokestop({
			...pokestop,
			quest_rewards: [{ type: 3, info: { amount: 500 } }],
			alternative_quest_rewards: [{ type: 2, info: { item_id: 1, amount: 3 } }]
		});

		expect(typeof mapped.quest_rewards).toBe("string");
		expect(JSON.parse(mapped.quest_rewards!)[0]).toEqual({ type: 3, info: { amount: 500 } });
		expect(typeof mapped.alternative_quest_rewards).toBe("string");
		expect(JSON.parse(mapped.alternative_quest_rewards!)[0]).toEqual({
			type: 2,
			info: { item_id: 1, amount: 3 }
		});
	});

	it("handles both wire generations for showcase blobs", () => {
		const native = mapPokestop({
			...pokestop,
			showcase_focus: { type: "pokemon", pokemon_id: 25 },
			showcase_rankings: { total_entries: 3, contest_entries: [] }
		});
		expect(JSON.parse(native.showcase_focus!)).toEqual({ type: "pokemon", pokemon_id: 25 });
		expect(JSON.parse(native.showcase_rankings!)).toEqual({
			total_entries: 3,
			contest_entries: []
		});

		const legacy = mapPokestop({
			...pokestop,
			showcase_focus: '{"type":"pokemon","pokemon_id":25}'
		});
		expect(legacy.showcase_focus).toBe('{"type":"pokemon","pokemon_id":25}');
	});

	it("leaves absent quest rewards undefined", () => {
		const mapped = mapPokestop({
			...pokestop,
			quest_rewards: null
		});

		expect(mapped.quest_rewards).toBeUndefined();
		expect(mapped.alternative_quest_rewards).toBeUndefined();
	});

	it("omits API-only quest form fields", () => {
		const mapped = mapPokestop({
			...pokestop,
			quest_pokemon_form_id: 61,
			alternative_quest_pokemon_form_id: 62
		});

		expect(mapped).not.toHaveProperty("quest_pokemon_form_id");
		expect(mapped).not.toHaveProperty("alternative_quest_pokemon_form_id");
	});
});
