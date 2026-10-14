import { describe, expect, it } from "vitest";
import { rankShowcaseCandidates } from "@/lib/utils/showcaseCandidates";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";

function candidate(
	id: string,
	score: number | undefined,
	extra: Partial<PokemonData> = {}
): PokemonData {
	return {
		id,
		mapId: `pokemon-${id}`,
		type: MapObjectType.POKEMON,
		pokemon_id: 25,
		form: 0,
		lat: 0,
		lon: 0,
		expire_timestamp: 200,
		personal_sizes: { trainer: { trainerName: "Fixture", height: 0.5, weight: 5, score } },
		...extra
	};
}

describe("loaded personal showcase candidates", () => {
	it("orders raw scores before display rounding without mutating input", () => {
		const candidates = [candidate("a", 1000.41), candidate("b", 1000.49)];
		expect(rankShowcaseCandidates(candidates, "trainer", 25, 0, 0, 100).map((p) => p.id)).toEqual([
			"b",
			"a"
		]);
		expect(candidates.map((p) => p.id)).toEqual(["a", "b"]);
	});
	it("compares the inclusive threshold to full precision", () => {
		expect(
			rankShowcaseCandidates(
				[candidate("a", 1000.999), candidate("b", 1001)],
				"trainer",
				25,
				0,
				1001,
				100
			).map((p) => p.id)
		).toEqual(["b"]);
	});
	it("does not mix trainers, species, forms, expired or unscored candidates", () => {
		const candidates = [
			candidate("ok", 900),
			candidate("missing", undefined),
			candidate("nan", NaN),
			candidate("expired", 1200, { expire_timestamp: 100 }),
			candidate("unknown-expiry", 1200, { expire_timestamp: undefined }),
			candidate("species", 1200, { pokemon_id: 26 }),
			candidate("form", 1200, { form: 1 }),
			candidate("other-trainer", 1200, {
				personal_sizes: { other: { trainerName: "Other", height: 1, weight: 1, score: 1300 } }
			})
		];
		expect(rankShowcaseCandidates(candidates, "trainer", 25, 0, 0, 100).map((p) => p.id)).toEqual([
			"ok"
		]);
	});
	it("has deterministic ordering for equal raw scores and rejects invalid controls", () => {
		const candidates = [candidate("b", 1200), candidate("a", 1200)];
		expect(rankShowcaseCandidates(candidates, "trainer", 25, 0, 0, 100).map((p) => p.id)).toEqual([
			"a",
			"b"
		]);
		for (const min of [NaN, Infinity, -1])
			expect(rankShowcaseCandidates(candidates, "trainer", 25, 0, min, 100)).toEqual([]);
		expect(rankShowcaseCandidates(candidates, "", 25, 0, 0, 100)).toEqual([]);
	});
});
