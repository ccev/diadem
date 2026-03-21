import { describe, it, expect, vi, beforeEach } from "vitest";
import { processRawPokestop } from "./queryPokestops";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";

vi.mock("@/lib/utils/pokemonUtils", () => ({
	getNormalizedForm: vi.fn((pokemonId: number, formId: number) => formId ?? 0),
	reverseNormalizedFormPokemonIds: []
}));

const mockTimestamp = vi.mocked(currentTimestamp);
const mockGetNormalizedForm = vi.mocked(getNormalizedForm);

function makePokestopData(overrides: Partial<PokestopData> = {}): PokestopData {
	return {
		id: "stop-1",
		mapId: "pokestop-stop-1",
		type: "pokestop" as any,
		lat: 0,
		lon: 0,
		updated: 0,
		deleted: 0,
		first_seen_timestamp: 0,
		incident: [],
		...overrides
	} as PokestopData;
}

describe("processRawPokestop", () => {
	beforeEach(() => {
		mockTimestamp.mockReturnValue(1000);
		mockGetNormalizedForm.mockImplementation((pokemonId: any, formId: any) => formId ?? 0);
	});

	it("parses showcase_focus JSON when not expired", () => {
		const pokestop = makePokestopData({
			showcase_focus: '{"type":"pokemon","pokemon_id":25,"pokemon_form":0}',
			showcase_expiry: 2000
		});
		processRawPokestop(pokestop);
		expect(pokestop.contest_focus).toEqual({
			type: "pokemon",
			pokemon_id: 25,
			pokemon_form: 0
		});
	});

	it("normalizes pokemon form in showcase_focus", () => {
		mockGetNormalizedForm.mockReturnValueOnce(99);
		const pokestop = makePokestopData({
			showcase_focus: '{"type":"pokemon","pokemon_id":25,"pokemon_form":5}',
			showcase_expiry: 2000
		});
		processRawPokestop(pokestop);
		expect(pokestop.contest_focus?.pokemon_form).toBe(99);
	});

	it("skips showcase parsing when expired", () => {
		const pokestop = makePokestopData({
			showcase_focus: '{"type":"pokemon","pokemon_id":25,"pokemon_form":0}',
			showcase_expiry: 500
		});
		processRawPokestop(pokestop);
		expect(pokestop.contest_focus).toBeUndefined();
	});

	it("skips showcase parsing when showcase_expiry is undefined", () => {
		const pokestop = makePokestopData({
			showcase_focus: '{"type":"pokemon","pokemon_id":25}',
			showcase_expiry: undefined
		});
		processRawPokestop(pokestop);
		expect(pokestop.contest_focus).toBeUndefined();
	});

	it("does not normalize non-pokemon contest focus", () => {
		const pokestop = makePokestopData({
			showcase_focus: '{"type":"type","pokemon_type_1":10}',
			showcase_expiry: 2000
		});
		processRawPokestop(pokestop);
		expect(pokestop.contest_focus?.type).toBe("type");
		// getNormalizedForm should not have been called for the contest focus
	});

	it("normalizes showcase_pokemon_form_id", () => {
		mockGetNormalizedForm.mockReturnValue(42);
		const pokestop = makePokestopData({
			showcase_pokemon_id: 25,
			showcase_pokemon_form_id: 5
		});
		processRawPokestop(pokestop);
		expect(pokestop.showcase_pokemon_form_id).toBe(42);
	});

	it("normalizes incident slot forms", () => {
		mockGetNormalizedForm.mockImplementation((_pid: any, form: any) => (form ?? 0) + 100);
		const pokestop = makePokestopData({
			incident: [{
				id: "inc-1",
				pokestop_id: "stop-1",
				start: 0,
				expiration: 2000,
				display_type: 1,
				style: 0,
				character: 4,
				updated: 0,
				confirmed: false,
				slot_1_pokemon_id: 25,
				slot_1_form: 1,
				slot_2_pokemon_id: 26,
				slot_2_form: 2,
				slot_3_pokemon_id: 27,
				slot_3_form: 3
			}]
		});
		processRawPokestop(pokestop);
		expect(pokestop.incident[0].slot_1_form).toBe(101);
	});

	it("handles empty incidents array", () => {
		const pokestop = makePokestopData({ incident: [] });
		expect(() => processRawPokestop(pokestop)).not.toThrow();
	});

	it("handles incidents with null entries", () => {
		const pokestop = makePokestopData({
			incident: [null as any, { id: null } as any]
		});
		expect(() => processRawPokestop(pokestop)).not.toThrow();
	});
});
