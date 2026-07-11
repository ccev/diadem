import { describe, expect, it } from "vitest";
import { getConfirmedInvasionReward } from "@/lib/server/queryMapObjects/invasionRewards";
import type { MasterStats } from "@/lib/server/api/queryStats";
import type { Incident } from "@/lib/types/mapObjectData/pokestop";

const lineups: MasterStats["activeCharacters"] = [
	{
		character: 1,
		count: 0,
		first: [{ pokemon_id: 1, form: 0, encounter: true, shiny: false }],
		second: [],
		third: []
	},
	{
		character: 2,
		count: 0,
		first: [{ pokemon_id: 2, form: 0, encounter: true, shiny: false }],
		second: [{ pokemon_id: 3, form: 0, encounter: true, shiny: false }],
		third: []
	},
	{
		character: 3,
		count: 0,
		first: [],
		second: [],
		third: [{ pokemon_id: 4, form: 0, encounter: true, shiny: false }]
	}
];

function incident(character: number, confirmed = false): Incident {
	return {
		id: "incident",
		pokestop_id: "pokestop",
		start: 0,
		expiration: 0,
		display_type: 1,
		style: 0,
		character,
		updated: 0,
		confirmed
	};
}

describe("getConfirmedInvasionReward", () => {
	it("returns the sole possible reward", () => {
		expect(getConfirmedInvasionReward(incident(1), lineups)).toEqual({
			pokemon_id: 1,
			form: 0,
			alignment: 1
		});
	});

	it("returns a scanned reward even when another reward pool exists", () => {
		const scanned = { ...incident(2, true), slot_1_pokemon_id: 2, slot_1_form: 0 };
		expect(getConfirmedInvasionReward(scanned, lineups)).toEqual({
			pokemon_id: 2,
			form: 0,
			alignment: 1
		});
	});

	it("does not confirm a reward from an unscanned secondary pool", () => {
		expect(getConfirmedInvasionReward(incident(2), lineups)).toBeUndefined();
	});

	it("returns a sole third-slot reward", () => {
		expect(getConfirmedInvasionReward(incident(3), lineups)).toEqual({
			pokemon_id: 4,
			form: 0,
			alignment: 1
		});
	});
});
