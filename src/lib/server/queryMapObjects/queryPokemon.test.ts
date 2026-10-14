import type { FilterPokemon } from "@/lib/features/filters/filters";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { PokemonScanBody } from "@/lib/server/api/golbat/types";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import { Features, type Perms } from "@/lib/utils/features";
import { beforeEach, describe, expect, it, vi } from "vitest";

const golbat = vi.hoisted(() => ({
	http: vi.fn(),
	single: vi.fn(),
	grpcOrHttp: vi.fn()
}));
const showcase = vi.hoisted(() => ({ metadata: vi.fn() }));
vi.mock("@/lib/server/api/golbat/http", () => ({
	getMultiplePokemon: golbat.http,
	getSinglePokemon: golbat.single
}));
vi.mock("@/lib/server/provider/showcaseMetadata", () => ({
	getShowcaseMetadata: showcase.metadata
}));
vi.mock("@/lib/server/api/golbat/grpc", () => ({
	grpcScanPokemon: vi.fn(),
	scanViaGrpcOrHttp: golbat.grpcOrHttp
}));

vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({
	isCurrentSelectedOverwrite: () => false
}));
vi.mock("@/lib/services/userSettings.svelte", () => ({}));
vi.mock("@/lib/services/masterfile", () => ({ getMasterPokemon: () => undefined }));
vi.mock("@/lib/features/activeSearch.svelte", () => ({}));
vi.mock("@/lib/features/masterStats.svelte", () => ({}));
vi.mock("@/lib/services/ingameLocale", () => ({}));
vi.mock("@/lib/services/uicons.svelte", () => ({}));
vi.mock("@/lib/map/featuresGen.svelte", () => ({}));
vi.mock("@/lib/map/map.svelte", () => ({}));

import { PokemonQuery } from "@/lib/server/queryMapObjects/queryPokemon";

const bounds = { minLat: 0, minLon: 0, maxLat: 1, maxLon: 1 };
const everywhere: Perms = {
	everywhere: [Features.POKEMON_ALL, Features.POKEMON_PERSONAL_SHINY],
	areas: []
};
const westHalfOnly: Perms = {
	everywhere: [Features.POKEMON, Features.POKEMON_IV],
	areas: [
		{
			name: "west",
			features: [Features.POKEMON_PERSONAL_SHINY],
			polygon: {
				type: "Polygon",
				coordinates: [
					[
						[0, 0],
						[0, 1],
						[0.5, 1],
						[0.5, 0],
						[0, 0]
					]
				]
			}
		}
	]
};

function context(perms: Perms, trainers?: Record<string, string>) {
	const ctx = new FeaturePermissionContext(perms, [
		Features.POKEMON,
		Features.POKEMON_IV,
		Features.POKEMON_PVP,
		Features.POKEMON_PERSONAL_SHINY
	]);
	if (trainers) {
		ctx.personalTrainers = new Map(Object.entries(trainers));
		// linked_trainer id "link-<player id>" for each trainer
		ctx.personalTrainerLinks = new Map(Object.keys(trainers).map((p) => [`link-${p}`, p]));
	}
	return ctx;
}

function filter(...filters: Partial<FilterPokemon["filters"][number]>[]) {
	return {
		category: "pokemon",
		enabled: true,
		filters: filters.map((f, i) => ({ id: String(i), enabled: true, title: {}, ...f }))
	} as unknown as FilterPokemon;
}

function mon(id: string, lon: number, extra: Record<string, unknown> = {}) {
	return { id, lat: 0.5, lon, pokemon_id: 25, form: 598, ...extra };
}

function scanResponse(pokemon: unknown[]) {
	return { pokemon, examined: pokemon.length, skipped: 0, total: pokemon.length };
}

beforeEach(() => {
	golbat.http.mockReset();
	golbat.single.mockReset();
	golbat.grpcOrHttp.mockReset();
	showcase.metadata.mockReset();
	showcase.metadata.mockReturnValue({ height: 0.4, weight: 6, weightStdDev: 1, xxlUpperBound: 2 });
});

describe("PokemonQuery personal shinies", () => {
	it("keeps the ordinary scan path when the user has no linked trainers", async () => {
		golbat.grpcOrHttp.mockResolvedValue(scanResponse([mon("1", 0.25, { iv: 100 })]));

		const result = await new PokemonQuery().query(
			bounds,
			filter({ iv: { min: 100, max: 100 } }),
			null,
			undefined,
			undefined,
			context(everywhere)
		);

		const body: PokemonScanBody = golbat.grpcOrHttp.mock.calls[0][1];
		expect(body.annotate_for).toBeUndefined();
		expect(result.data[0].shiny_for).toBeUndefined();
	});

	it("annotates and adds shiny_for only to personal filtersets", async () => {
		golbat.grpcOrHttp.mockResolvedValue(scanResponse([]));

		await new PokemonQuery().query(
			bounds,
			filter({ personalShiny: true }, { iv: { min: 100, max: 100 } }),
			null,
			undefined,
			undefined,
			context(everywhere, { p1: "Ash", p2: "Misty" })
		);

		const body: PokemonScanBody = golbat.grpcOrHttp.mock.calls[0][1];
		expect(body.annotate_for).toEqual(["p1", "p2"]);
		expect(body.filters[0].shiny_for).toEqual(["p1", "p2"]);
		expect(body.filters[1].shiny_for).toBeUndefined();
	});

	it("skips Golbat when every filterset is personal and no trainers are linked", async () => {
		const result = await new PokemonQuery().query(
			bounds,
			filter({ personalShiny: true }),
			null,
			undefined,
			undefined,
			context(everywhere)
		);

		expect(golbat.grpcOrHttp).not.toHaveBeenCalled();
		expect(result).toEqual({ data: [], examined: 0 });
	});

	it("maps player ids to trainer names and marks the pokemon shiny", async () => {
		golbat.grpcOrHttp.mockResolvedValue(
			scanResponse([
				mon("1", 0.25, { shiny_for: ["p2"], background_for: ["p1", "p2"] }),
				mon("2", 0.25)
			])
		);

		const result = await new PokemonQuery().query(
			bounds,
			filter({}),
			null,
			undefined,
			undefined,
			context(everywhere, { p1: "Ash", p2: "Misty" })
		);

		const [shiny, plain] = result.data;
		expect(shiny.shiny).toBe(true);
		expect(shiny.shiny_for).toEqual(["Misty"]);
		expect(shiny.background_for).toEqual(["Ash", "Misty"]);
		expect(plain.shiny).toBeUndefined();
		expect(plain.shiny_for).toBeUndefined();
	});

	it("strips personal results outside the permitted area", async () => {
		golbat.grpcOrHttp.mockResolvedValue(
			scanResponse([
				mon("west", 0.25, { shiny_for: ["p1"] }),
				mon("east", 0.75, { shiny_for: ["p1"] })
			])
		);

		const result = await new PokemonQuery().query(
			bounds,
			filter({ personalShiny: true }),
			null,
			undefined,
			undefined,
			context(westHalfOnly, { p1: "Ash" })
		);

		expect(result.data.map((p) => p.id)).toEqual(["west"]);
		expect(result.data[0].shiny_for).toEqual(["Ash"]);
	});

	it("limits a filterset to the trainers it names", async () => {
		golbat.grpcOrHttp.mockResolvedValue(scanResponse([]));

		await new PokemonQuery().query(
			bounds,
			filter({ personalShiny: true, personalShinyTrainers: ["link-p2"] }, { personalShiny: true }),
			null,
			undefined,
			undefined,
			context(everywhere, { p1: "Ash", p2: "Misty" })
		);

		const body: PokemonScanBody = golbat.grpcOrHttp.mock.calls[0][1];
		expect(body.annotate_for).toEqual(["p1", "p2"]);
		expect(body.filters[0].shiny_for).toEqual(["p2"]);
		expect(body.filters[1].shiny_for).toEqual(["p1", "p2"]);
	});

	it("drops a filterset whose trainer is no longer linked instead of matching everyone", async () => {
		golbat.grpcOrHttp.mockResolvedValue(scanResponse([]));

		const result = await new PokemonQuery().query(
			bounds,
			filter({ personalShiny: true, personalShinyTrainers: ["link-gone"] }),
			null,
			undefined,
			undefined,
			context(everywhere, { p1: "Ash" })
		);

		expect(golbat.grpcOrHttp).not.toHaveBeenCalled();
		expect(result).toEqual({ data: [], examined: 0 });
	});

	it("returns linked trainer ids and keeps only mons shiny for the chosen trainer", async () => {
		golbat.grpcOrHttp.mockResolvedValue(
			scanResponse([
				mon("both", 0.25, { shiny_for: ["p1", "p2"] }),
				mon("misty", 0.25, { shiny_for: ["p2"] }),
				mon("ash", 0.25, { shiny_for: ["p1"] })
			])
		);

		const result = await new PokemonQuery().query(
			bounds,
			filter({ personalShiny: true, personalShinyTrainers: ["link-p1"] }),
			null,
			undefined,
			undefined,
			context(everywhere, { p1: "Ash", p2: "Misty" })
		);

		expect(result.data.map((p) => p.id)).toEqual(["both", "ash"]);
		expect(result.data[0].shiny_for_links).toEqual(["link-p1", "link-p2"]);
		expect(result.data[1].shiny_for_links).toEqual(["link-p1"]);
	});

	it("checks every trainer a filterset names", async () => {
		golbat.grpcOrHttp.mockResolvedValue(
			scanResponse([
				mon("a", 0.25, { shiny_for: ["p1"] }),
				mon("b", 0.25, { shiny_for: ["p2"] }),
				mon("c", 0.25, { shiny_for: ["p3"] })
			])
		);

		const result = await new PokemonQuery().query(
			bounds,
			filter({ personalShiny: true, personalShinyTrainers: ["link-p2", "link-p3"] }),
			null,
			undefined,
			undefined,
			context(everywhere, { p1: "A", p2: "B", p3: "C" })
		);

		const body: PokemonScanBody = golbat.grpcOrHttp.mock.calls[0][1];
		expect(body.filters[0].shiny_for).toEqual(["p2", "p3"]);
		expect(result.data.map((p) => p.id)).toEqual(["b", "c"]);
	});
});

describe("PokemonQuery personal showcase dimensions", () => {
	const scoredInputs = { size: 3, atk_iv: 15, def_iv: 15, sta_iv: 15 };
	const dimensions = { height: 0.8, weight: 12 };

	async function queryPersonal(
		pokemon: unknown[],
		ctx = context(everywhere, { p1: "Ash", p2: "Misty" })
	) {
		golbat.grpcOrHttp.mockResolvedValue(scanResponse(pokemon));
		return new PokemonQuery().query(bounds, filter({}), null, undefined, undefined, ctx);
	}

	it("maps only current linked trainers to private link ids and calculates their own scores", async () => {
		const result = await queryPersonal([
			mon("1", 0.25, {
				...scoredInputs,
				height: 9,
				weight: 999,
				size_for: {
					p1: { ...dimensions, playerId: "p1" },
					p2: { height: 0.9, weight: 14 },
					stranger: { height: 1, weight: 15 }
				}
			})
		]);

		const pokemon = result.data[0];
		expect(Object.keys(pokemon.personal_sizes ?? {})).toEqual(["link-p1", "link-p2"]);
		expect(pokemon.personal_sizes?.["link-p1"]).toEqual({
			trainerName: "Ash",
			...dimensions,
			score: expect.any(Number)
		});
		expect(pokemon.personal_sizes?.["link-p2"].score).toBeGreaterThan(
			pokemon.personal_sizes?.["link-p1"].score ?? Infinity
		);
		expect(pokemon).not.toHaveProperty("size_for");
		expect(JSON.stringify(pokemon)).not.toContain('"playerId"');
		expect(JSON.stringify(pokemon)).not.toContain('"stranger"');
		expect(showcase.metadata).toHaveBeenCalledWith(25, 598);
	});

	it("requires both a trainer name and a current link before returning dimensions", async () => {
		const ctx = context(everywhere, { p1: "Ash", p2: "Misty" });
		ctx.personalTrainerLinks = new Map([
			["link-p1", "p1"],
			["link-stranger", "stranger"]
		]);
		const result = await queryPersonal(
			[mon("1", 0.25, { size_for: { p1: dimensions, p2: dimensions, stranger: dimensions } })],
			ctx
		);
		expect(result.data[0].personal_sizes).toEqual({
			"link-p1": { trainerName: "Ash", ...dimensions, score: undefined }
		});
	});

	it("never falls back to the mapper's dimensions when personal dimensions are absent", async () => {
		const result = await queryPersonal([
			mon("1", 0.25, { ...scoredInputs, height: 0.8, weight: 12 }),
			mon("2", 0.25, { ...scoredInputs, size_for: { stranger: dimensions } })
		]);
		expect(result.data.every((pokemon) => pokemon.personal_sizes === undefined)).toBe(true);
	});

	it.each([
		{ height: 0, weight: 1 },
		{ height: -1, weight: 1 },
		{ height: NaN, weight: 1 },
		{ height: Infinity, weight: 1 },
		{ height: 1, weight: -1 },
		{ height: 1, weight: NaN },
		{ height: 1, weight: Infinity },
		{ height: "1", weight: 1 },
		null
	])("drops invalid personal dimensions: %j", async (invalid) => {
		const result = await queryPersonal([
			mon("1", 0.25, { ...scoredInputs, size_for: { p1: invalid } })
		]);
		expect(result.data[0].personal_sizes).toBeUndefined();
	});

	it("preserves a valid zero weight rather than substituting mapper data", async () => {
		const result = await queryPersonal([
			mon("1", 0.25, { weight: 100, size_for: { p1: { height: 0.8, weight: 0 } } })
		]);
		expect(result.data[0].personal_sizes?.["link-p1"].weight).toBe(0);
	});

	it.each([
		{ size: undefined },
		{ size: 0 },
		{ atk_iv: undefined },
		{ def_iv: undefined },
		{ sta_iv: undefined },
		{ atk_iv: -1 },
		{ def_iv: 16 },
		{ sta_iv: 1.5 }
	])("keeps dimensions without scoring incomplete or invalid inputs: %j", async (invalid) => {
		const result = await queryPersonal([
			mon("1", 0.25, { ...scoredInputs, ...invalid, size_for: { p1: dimensions } })
		]);
		expect(result.data[0].personal_sizes?.["link-p1"]).toEqual({
			trainerName: "Ash",
			...dimensions,
			score: undefined
		});
	});

	it("keeps dimensions without a score when form metadata is unavailable", async () => {
		showcase.metadata.mockReturnValue(undefined);
		const result = await queryPersonal([
			mon("1", 0.25, { ...scoredInputs, size_for: { p1: dimensions } })
		]);
		expect(result.data[0].personal_sizes?.["link-p1"].height).toBe(dimensions.height);
		expect(result.data[0].personal_sizes?.["link-p1"].score).toBeUndefined();
	});

	it.each([
		{ pokemon_id: 710 },
		{ pokemon_id: 711 },
		{ is_ditto: true },
		{ display_pokemon_id: 133 },
		{ alignment: 1 },
		{ temp_evolution_id: 1 },
		{ bread_mode: 1 }
	])("does not score candidates outside supported wild forms: %j", async (unsupported) => {
		const result = await queryPersonal([
			mon("1", 0.25, { ...scoredInputs, ...unsupported, size_for: { p1: dimensions } })
		]);
		expect(result.data[0].personal_sizes?.["link-p1"].score).toBeUndefined();
	});

	it("strips personal dimensions outside the personal permission area", async () => {
		const result = await queryPersonal(
			[
				mon("west", 0.25, { size_for: { p1: dimensions } }),
				mon("east", 0.75, { size_for: { p1: dimensions } })
			],
			context(westHalfOnly, { p1: "Ash" })
		);
		expect(result.data[0].personal_sizes).toBeDefined();
		expect(result.data[1].personal_sizes).toBeUndefined();
	});

	it("strips personal dimensions outside the IV permission area", async () => {
		const ivWest: Perms = {
			everywhere: [Features.POKEMON, Features.POKEMON_PERSONAL_SHINY],
			areas: westHalfOnly.areas.map((area) => ({ ...area, features: [Features.POKEMON_IV] }))
		};
		const result = await queryPersonal(
			[
				mon("west", 0.25, { size_for: { p1: dimensions } }),
				mon("east", 0.75, { size_for: { p1: dimensions } })
			],
			context(ivWest, { p1: "Ash" })
		);
		expect(result.data[0].personal_sizes).toBeDefined();
		expect(result.data[1].personal_sizes).toBeUndefined();
	});

	it.each([Features.POKEMON_IV, Features.POKEMON_PERSONAL_SHINY])(
		"scrubs prepared dimensions after losing %s permission",
		(feature) => {
			const pokemon: MinMapObject<PokemonData> = {
				...mon("1", 0.25),
				personal_sizes: { "link-p1": { trainerName: "Ash", ...dimensions, score: 900 } }
			};
			const perms = {
				everywhere: [Features.POKEMON, Features.POKEMON_IV, Features.POKEMON_PERSONAL_SHINY].filter(
					(held) => held !== feature
				),
				areas: []
			};
			new PokemonQuery().prepare(pokemon, context(perms, { p1: "Ash" }));
			expect(pokemon.personal_sizes).toBeUndefined();
		}
	);

	it("scrubs prepared dimensions for unlinked trainers", () => {
		const pokemon: MinMapObject<PokemonData> = {
			...mon("1", 0.25),
			personal_sizes: { "link-p1": { trainerName: "Ash", ...dimensions, score: 900 } }
		};
		new PokemonQuery().prepare(pokemon, context(everywhere));
		expect(pokemon.personal_sizes).toBeUndefined();
	});

	it("never returns personal annotations from an unannotated single query", async () => {
		golbat.single.mockResolvedValue(
			mon("1", 0.25, {
				...scoredInputs,
				size_for: { p1: dimensions },
				personal_sizes: { "link-p1": { trainerName: "Ash", ...dimensions, score: 900 } }
			})
		);
		const [pokemon] = await new PokemonQuery().querySingle("1");
		expect(pokemon.personal_sizes).toBeUndefined();
		expect(pokemon).not.toHaveProperty("size_for");
	});

	it("skips score-only filtersets for missing or unlinked trainer ids", async () => {
		const result = await new PokemonQuery().query(
			bounds,
			filter({ showcase: { trainerId: "link-gone", minScore: 900 } }),
			null,
			undefined,
			undefined,
			context(everywhere, { p1: "Ash" })
		);
		expect(result).toEqual({ data: [], examined: 0 });
		expect(golbat.http).not.toHaveBeenCalled();
		expect(golbat.grpcOrHttp).not.toHaveBeenCalled();
	});

	it("annotates score candidates without sending the score threshold to Golbat", async () => {
		golbat.grpcOrHttp.mockResolvedValue(scanResponse([]));
		await new PokemonQuery().query(
			bounds,
			filter({ showcase: { trainerId: "link-p1", minScore: 900 } }),
			null,
			undefined,
			undefined,
			context(everywhere, { p1: "Ash" })
		);
		const body: PokemonScanBody = golbat.grpcOrHttp.mock.calls[0][1];
		expect(body.annotate_for).toEqual(["p1"]);
		expect(body.filters).toEqual([{}]);
	});
});
