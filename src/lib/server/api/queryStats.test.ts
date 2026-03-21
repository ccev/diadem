import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	extractPokemonIdFromLeekduckImage,
	getInvasionCharacterId
} from "./queryStats";
import { getMasterPokemon } from "@/lib/services/masterfile";

// Mock the DB query module
vi.mock("@/lib/server/db/external/internalQuery", () => ({
	query: vi.fn(() => ({ result: [] }))
}));

// Mock the masterfile provider
vi.mock("@/lib/server/provider/masterfileProvider", () => ({
	masterfileProvider: { get: vi.fn() }
}));

const mockGetMasterPokemon = vi.mocked(getMasterPokemon);

describe("extractPokemonIdFromLeekduckImage", () => {
	beforeEach(() => {
		mockGetMasterPokemon.mockReset();
	});

	it("extracts pokemon ID from simple filename", () => {
		const result = extractPokemonIdFromLeekduckImage(
			"https://example.com/images/pm001.icon.png"
		);
		expect(result.pokemonId).toBe(1);
		expect(result.formId).toBe(0);
	});

	it("extracts pokemon ID with form name", () => {
		mockGetMasterPokemon.mockReturnValue({
			defaultFormId: 0,
			forms: {
				"1": { name: "ALOLA" },
				"2": { name: "GALAR" }
			}
		} as any);

		const result = extractPokemonIdFromLeekduckImage(
			"https://example.com/images/pm025.fALOLA.icon.png"
		);
		expect(result.pokemonId).toBe(25);
		expect(result.formId).toBe(1);
	});

	it("handles GMAX form", () => {
		mockGetMasterPokemon.mockReturnValue({
			forms: {
				"10": { name: "GMAX" }
			}
		} as any);

		const result = extractPokemonIdFromLeekduckImage(
			"https://example.com/pm001.fGMAX.icon.png"
		);
		expect(result.pokemonId).toBe(1);
		expect(result.formId).toBe(10);
	});

	it("returns formId 0 when form name not found in master", () => {
		mockGetMasterPokemon.mockReturnValue({
			forms: {
				"1": { name: "ALOLA" }
			}
		} as any);

		const result = extractPokemonIdFromLeekduckImage(
			"https://example.com/pm025.fUNKNOWN.icon.png"
		);
		expect(result.pokemonId).toBe(25);
		expect(result.formId).toBe(0);
	});

	it("returns zeroes for non-matching filenames", () => {
		const result = extractPokemonIdFromLeekduckImage(
			"https://example.com/invalid.png"
		);
		expect(result.pokemonId).toBe(0);
		expect(result.formId).toBe(0);
	});

	it("returns zeroes for empty string", () => {
		const result = extractPokemonIdFromLeekduckImage("");
		expect(result.pokemonId).toBe(0);
		expect(result.formId).toBe(0);
	});

	it("handles three-digit pokemon IDs", () => {
		const result = extractPokemonIdFromLeekduckImage(
			"https://example.com/pm150.icon.png"
		);
		expect(result.pokemonId).toBe(150);
	});

	it("handles case-insensitive form name matching", () => {
		mockGetMasterPokemon.mockReturnValue({
			forms: {
				"5": { name: "Shadow" }
			}
		} as any);

		const result = extractPokemonIdFromLeekduckImage(
			"https://example.com/pm025.fSHADOW.icon.png"
		);
		expect(result.pokemonId).toBe(25);
		expect(result.formId).toBe(5);
	});
});

describe("getInvasionCharacterId", () => {
	// Leaders
	it("identifies Giovanni", () => {
		expect(getInvasionCharacterId("Giovanni", "")).toBe(44);
	});

	it("identifies Cliff", () => {
		expect(getInvasionCharacterId("Cliff", "")).toBe(41);
	});

	it("identifies Arlo", () => {
		expect(getInvasionCharacterId("Arlo", "")).toBe(42);
	});

	it("identifies Sierra", () => {
		expect(getInvasionCharacterId("Sierra", "")).toBe(43);
	});

	// Decoys
	it("identifies female decoy", () => {
		expect(getInvasionCharacterId("Female Decoy Grunt", "")).toBe(46);
	});

	it("identifies male decoy", () => {
		expect(getInvasionCharacterId("Male Decoy Grunt", "")).toBe(45);
	});

	// Plain grunts without type
	it("identifies female grunt", () => {
		expect(getInvasionCharacterId("Female Grunt", "")).toBe(5);
	});

	it("identifies male grunt", () => {
		expect(getInvasionCharacterId("Male Grunt", "")).toBe(4);
	});

	// Typed grunts
	it("identifies female fire grunt", () => {
		expect(getInvasionCharacterId("Female Grunt - Fire Type", "fire")).toBe(18);
	});

	it("identifies male fire grunt", () => {
		expect(getInvasionCharacterId("Male Grunt - Fire Type", "fire")).toBe(19);
	});

	it("identifies female water grunt", () => {
		expect(getInvasionCharacterId("Female Grunt - Water Type", "water")).toBe(38);
	});

	it("identifies male water grunt", () => {
		expect(getInvasionCharacterId("Male Grunt - Water Type", "water")).toBe(39);
	});

	it("identifies female ghost grunt", () => {
		expect(getInvasionCharacterId("Female Grunt - Ghost Type", "ghost")).toBe(47);
	});

	it("identifies male electric grunt", () => {
		expect(getInvasionCharacterId("Male Grunt - Electric Type", "electric")).toBe(50);
	});

	it("identifies steel/metal type as same IDs", () => {
		expect(getInvasionCharacterId("Female Grunt - Steel Type", "steel")).toBe(28);
		expect(getInvasionCharacterId("Female Grunt - Metal Type", "metal")).toBe(28);
	});

	// Edge cases
	it("is case-insensitive for names", () => {
		expect(getInvasionCharacterId("GIOVANNI", "")).toBe(44);
		expect(getInvasionCharacterId("cliff", "")).toBe(41);
	});

	it("returns null for unknown type", () => {
		expect(getInvasionCharacterId("Female Grunt - Cosmic Type", "cosmic")).toBeNull();
	});

	it("returns null for ambiguous input", () => {
		expect(getInvasionCharacterId("Unknown", "fire")).toBeNull();
	});
});
