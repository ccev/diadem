import { describe, it, expect } from "vitest";
import { getTappableName } from "./tappableUtils";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";

function makeTappable(overrides: Partial<TappableData> = {}): TappableData {
	return {
		id: "1",
		mapId: "1",
		type: "tappable" as any,
		lat: 0,
		lon: 0,
		tappable_type: "test",
		pokemon_id: null,
		item_id: null,
		count: null,
		expire_timestamp_verified: 0,
		expire_timestamp: null,
		updated: 0,
		...overrides
	};
}

describe("getTappableName", () => {
	it("returns pokemon name when pokemon_id is set", () => {
		expect(getTappableName(makeTappable({ pokemon_id: 25 }))).toBe("pokemon:25:0");
	});

	it("returns item name when item_id is set", () => {
		expect(getTappableName(makeTappable({ item_id: 1 }))).toBe("item:1");
	});

	it("returns unknown_tappable when neither is set", () => {
		expect(getTappableName(makeTappable())).toBe("unknown_tappable");
	});

	it("prefers pokemon_id over item_id", () => {
		expect(getTappableName(makeTappable({ pokemon_id: 25, item_id: 1 }))).toBe("pokemon:25:0");
	});
});
