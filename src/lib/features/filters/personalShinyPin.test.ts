import { describe, expect, it } from "vitest";
import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";
import {
	onlyLinkedTrainerId,
	pinUnchosenFiltersets
} from "@/lib/features/filters/personalShinyPin";

function fs(extra: Partial<FiltersetPokemon>): FiltersetPokemon {
	return { id: "x", title: { title: "" }, enabled: true, ...extra } as unknown as FiltersetPokemon;
}

describe("onlyLinkedTrainerId", () => {
	it("returns the trainer when exactly one finished linking", () => {
		expect(
			onlyLinkedTrainerId([
				{ id: "t1", status: "complete" },
				{ id: "t2", status: "queued" }
			])
		).toBe("t1");
	});

	it("returns nothing for zero or several linked trainers", () => {
		expect(onlyLinkedTrainerId([])).toBeUndefined();
		expect(
			onlyLinkedTrainerId([
				{ id: "t1", status: "complete" },
				{ id: "t2", status: "complete" }
			])
		).toBeUndefined();
	});
});

describe("pinUnchosenFiltersets", () => {
	it("pins only personal filtersets that never had a trainer chosen", () => {
		const unchosen = fs({ personalShiny: true });
		const explicitAll = fs({ personalShiny: true, personalShinyTrainers: [] });
		const chosen = fs({ personalShiny: true, personalShinyTrainers: ["t2"] });
		const plain = fs({ iv: { min: 100, max: 100 } });

		expect(pinUnchosenFiltersets([unchosen, explicitAll, chosen, plain], "t1")).toBe(1);
		expect(unchosen.personalShinyTrainers).toEqual(["t1"]);
		expect(explicitAll.personalShinyTrainers).toEqual([]);
		expect(chosen.personalShinyTrainers).toEqual(["t2"]);
		expect(plain.personalShinyTrainers).toBeUndefined();
	});
});
