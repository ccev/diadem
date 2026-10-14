import { afterEach, describe, expect, it, vi } from "vitest";
import {
	parseShowcaseMetadata,
	ShowcaseMetadataProvider
} from "@/lib/server/provider/showcaseMetadata";

const config = vi.hoisted(() => ({
	playerId: { url: "https://playerid.example", apiKey: "fixture-key" }
}));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => config }));

const masterfile = {
	pokemon: {
		"25": {
			forms: {
				"0": { proto: "FORM_UNSET" },
				"598": { proto: "PIKACHU_NORMAL" },
				"999": { proto: "PIKACHU_TEST" }
			}
		},
		"710": { forms: {} },
		"711": { forms: {} }
	}
};

function pokemon(form?: string, overrides = {}) {
	return {
		templateId: `V0025_POKEMON_${form ?? "PIKACHU"}`,
		data: {
			pokemonSettings: {
				pokemonId: "PIKACHU",
				...(form ? { form } : {}),
				pokedexHeightM: 0.4,
				pokedexWeightKg: 6,
				weightStdDev: 0.75,
				...overrides
			}
		}
	};
}

function extended(form?: string, overrides = {}) {
	return {
		templateId: `EXTENDED_V0025_POKEMON_${form ?? "PIKACHU"}`,
		data: {
			pokemonExtendedSettings: {
				uniqueId: "PIKACHU",
				...(form ? { form } : {}),
				sizeSettings: { xxlUpperBound: 0.7 },
				...overrides
			}
		}
	};
}

const source = [pokemon(), extended(), pokemon("PIKACHU_NORMAL"), extended("PIKACHU_NORMAL")];

afterEach(() => {
	vi.unstubAllGlobals();
	config.playerId = { url: "https://playerid.example", apiKey: "fixture-key" };
});

describe("Showcase metadata source join", () => {
	it("maps only exact species/form enums and keeps form zero separate", () => {
		const parsed = parseShowcaseMetadata(source, masterfile);
		expect([...parsed.keys()]).toEqual(["25:0", "25:598"]);
		expect(parsed.get("25:598")).toEqual({
			height: 0.4,
			weight: 6,
			weightStdDev: 0.75,
			xxlUpperBound: 0.7
		});
		expect(parsed.get("25:999")).toBeUndefined();
	});

	it("does not substitute base or Normal bounds for another form", () => {
		const parsed = parseShowcaseMetadata([...source, pokemon("PIKACHU_TEST")], masterfile);
		expect(parsed.get("25:999")).toBeUndefined();
		expect(parsed.get("25:0")).toBeDefined();
	});

	it("does not guess a numeric form for an unknown or ambiguous proto", () => {
		const parsed = parseShowcaseMetadata(
			[...source, pokemon("PIKACHU_UNKNOWN"), extended("PIKACHU_UNKNOWN")],
			masterfile
		);
		expect(parsed.size).toBe(2);
		const ambiguous = {
			pokemon: {
				"25": { forms: { "598": { proto: "PIKACHU_NORMAL" }, "599": { proto: "PIKACHU_NORMAL" } } }
			}
		};
		expect([...parseShowcaseMetadata(source, ambiguous).keys()]).toEqual(["25:0"]);
	});

	it("uses the exact form's deviation, means and explicit inline size metadata", () => {
		const parsed = parseShowcaseMetadata(
			[
				...source,
				pokemon("PIKACHU_TEST", {
					pokedexHeightM: 0.2,
					pokedexWeightKg: 2.5,
					weightStdDev: 0.1,
					sizeSettings: { xxlUpperBound: 0.31 }
				})
			],
			masterfile
		);
		expect(parsed.get("25:999")).toEqual({
			height: 0.2,
			weight: 2.5,
			weightStdDev: 0.1,
			xxlUpperBound: 0.31
		});
	});

	it("accepts identical extended duplicates regardless of property order", () => {
		const duplicate = {
			data: {
				pokemonExtendedSettings: {
					sizeSettings: { xxlUpperBound: 0.7 },
					uniqueId: "PIKACHU"
				}
			}
		};
		expect(parseShowcaseMetadata([...source, duplicate], masterfile).get("25:0")).toBeDefined();
	});

	it("rejects conflicting extended duplicates in either order", () => {
		const conflict = extended(undefined, { sizeSettings: { xxlUpperBound: 0.62 } });
		for (const records of [
			[...source, conflict],
			[conflict, ...source]
		]) {
			const parsed = parseShowcaseMetadata(records, masterfile);
			expect(parsed.get("25:0")).toBeUndefined();
			expect(parsed.get("25:598")).toBeDefined();
		}
	});

	it("rejects duplicate exact Pokémon templates in either order", () => {
		const duplicate = pokemon(undefined, { weightStdDev: undefined });
		for (const records of [
			[...source, duplicate],
			[duplicate, ...source]
		]) {
			expect(parseShowcaseMetadata(records, masterfile).get("25:0")).toBeUndefined();
		}
	});

	it.each([undefined, NaN, Infinity, -1])("does not fill missing/invalid deviation %s", (value) => {
		const parsed = parseShowcaseMetadata(
			[...source, pokemon("PIKACHU_TEST", { weightStdDev: value }), extended("PIKACHU_TEST")],
			masterfile
		);
		expect(parsed.get("25:999")).toBeUndefined();
	});

	it("excludes Pumpkaboo and Gourgeist without an ordinary species fallback", () => {
		const special = [710, 711].map((id) => ({
			...pokemon(undefined, { sizeSettings: { xxlUpperBound: 0.7 } }),
			templateId: `V${id}_POKEMON_TEST`
		}));
		expect(parseShowcaseMetadata([...source, ...special], masterfile).size).toBe(2);
	});

	it("rejects invalid or empty source datasets", () => {
		for (const value of [undefined, {}, [], [null]]) {
			expect(() => parseShowcaseMetadata(value, masterfile)).toThrow();
		}
		expect(() => parseShowcaseMetadata(source, { pokemon: {} })).toThrow();
	});
});

describe("Showcase metadata provider", () => {
	it("does not fetch when linked trainers are not configured", async () => {
		config.playerId = { url: "", apiKey: "" };
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		const provider = new ShowcaseMetadataProvider();
		await provider.refresh();
		expect(fetch).not.toHaveBeenCalled();
		expect(provider.getMetadata(25, 0)).toBeUndefined();
	});

	it("retains a successfully cached dataset after a failed bounded refresh", async () => {
		const fetch = vi.fn(async (url: string, options: RequestInit) => {
			expect(options.signal).toBeInstanceOf(AbortSignal);
			return new Response(JSON.stringify(url.includes("PokeMiners") ? source : masterfile));
		});
		vi.stubGlobal("fetch", fetch);
		const provider = new ShowcaseMetadataProvider();
		await provider.refresh();
		expect(provider.getMetadata(25, 598)).toBeDefined();
		expect(provider.getMetadata(25, 999)).toBeUndefined();
		fetch.mockRejectedValueOnce(new Error("offline"));
		await expect(provider.refresh()).rejects.toThrow("offline");
		expect(provider.getMetadata(25, 598)).toBeDefined();
	});

	it("leaves scores unavailable on the first failed refresh", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
		const provider = new ShowcaseMetadataProvider();
		await expect(provider.refresh()).rejects.toThrow("503");
		expect(provider.getMetadata(25, 0)).toBeUndefined();
	});

	it("rejects an oversized response before consuming its body", async () => {
		const text = vi.fn();
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				headers: new Headers({ "content-length": String(41 * 1024 * 1024) }),
				text
			})
		);
		await expect(new ShowcaseMetadataProvider().refresh()).rejects.toThrow("too large");
		expect(text).not.toHaveBeenCalled();
	});

	it("cancels an oversized stream without Content-Length before buffering the entire source", async () => {
		let produced = 0;
		const cancel = vi.fn();
		const chunk = new Uint8Array(1024 * 1024).fill(32);
		const oversized = new Response(
			new ReadableStream({
				pull(controller) {
					if (produced === 100) {
						controller.close();
						return;
					}
					produced += 1;
					controller.enqueue(chunk);
				},
				cancel
			})
		);
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) =>
				url.includes("PokeMiners") ? oversized : new Response(JSON.stringify(masterfile))
			)
		);
		await expect(new ShowcaseMetadataProvider().refresh()).rejects.toThrow("too large");
		expect(cancel).toHaveBeenCalledOnce();
		expect(produced).toBeLessThanOrEqual(42);
	});
});
