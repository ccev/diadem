import { mapPokestop } from "@/lib/server/queryMapObjects/pokestopApiMapper";
import { describe, expect, it } from "vitest";

describe("mapPokestop", () => {
	it("re-serializes native-JSON quest rewards to the SQL string shape", () => {
		// Golbat's fort API sends quest_rewards as a real JSON array (#385 design),
		// while the SQL rows carry a serialized string that parseQuestReward
		// (JSON.parse + [0]) expects.
		const mapped = mapPokestop({
			id: "stop-1",
			lat: 1,
			lon: 2,
			deleted: false,
			quest_rewards: [{ type: 3, info: { amount: 500 } }],
			alternative_quest_rewards: [{ type: 2, info: { item_id: 1, amount: 3 } }]
		} as never);

		expect(typeof mapped.quest_rewards).toBe("string");
		expect(JSON.parse(mapped.quest_rewards!)[0]).toEqual({ type: 3, info: { amount: 500 } });
		expect(typeof mapped.alternative_quest_rewards).toBe("string");
		expect(JSON.parse(mapped.alternative_quest_rewards!)[0]).toEqual({
			type: 2,
			info: { item_id: 1, amount: 3 }
		});
	});

	it("handles both wire generations for showcase blobs", () => {
		// newer Golbat sends native JSON, older Golbat a serialized string
		const native = mapPokestop({
			id: "s",
			lat: 0,
			lon: 0,
			deleted: false,
			showcase_focus: { type: "pokemon", pokemon_id: 25 },
			showcase_rankings: { total_entries: 3, contest_entries: [] }
		} as never);
		expect(JSON.parse(native.showcase_focus!)).toEqual({ type: "pokemon", pokemon_id: 25 });
		expect(JSON.parse(native.showcase_rankings!)).toEqual({
			total_entries: 3,
			contest_entries: []
		});

		const legacy = mapPokestop({
			id: "s",
			lat: 0,
			lon: 0,
			deleted: false,
			showcase_focus: '{"type":"pokemon","pokemon_id":25}'
		} as never);
		expect(legacy.showcase_focus).toBe('{"type":"pokemon","pokemon_id":25}');
	});

	it("leaves absent quest rewards undefined", () => {
		const mapped = mapPokestop({
			id: "stop-2",
			lat: 0,
			lon: 0,
			deleted: false,
			quest_rewards: null
		} as never);

		expect(mapped.quest_rewards).toBeUndefined();
		expect(mapped.alternative_quest_rewards).toBeUndefined();
	});
});
