import type { FilterPokemon } from "@/lib/features/filters/filters";
import type { PokemonScanBody } from "@/lib/server/api/golbat/types";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { Features, type Perms } from "@/lib/utils/features";
import { beforeEach, describe, expect, it, vi } from "vitest";

const golbat = vi.hoisted(() => ({
	http: vi.fn(),
	grpcOrHttp: vi.fn()
}));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => ({}) }));
vi.mock("@/lib/server/db/external/internalQuery", () => ({ query: vi.fn() }));
vi.mock("@/lib/server/api/golbat/http", () => ({
	getMultiplePokemon: golbat.http,
	getSinglePokemon: vi.fn()
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
	golbat.grpcOrHttp.mockReset();
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

		expect(golbat.http).not.toHaveBeenCalled();
		const body: PokemonScanBody = golbat.grpcOrHttp.mock.calls[0][1];
		expect(body.annotate_for).toBeUndefined();
		expect(result.data[0].shiny_for).toBeUndefined();
	});

	it("annotates over HTTP and adds shiny_for only to personal filtersets", async () => {
		golbat.http.mockResolvedValue(scanResponse([]));

		await new PokemonQuery().query(
			bounds,
			filter({ personalShiny: true }, { iv: { min: 100, max: 100 } }),
			null,
			undefined,
			undefined,
			context(everywhere, { p1: "Ash", p2: "Misty" })
		);

		expect(golbat.grpcOrHttp).not.toHaveBeenCalled();
		const body: PokemonScanBody = golbat.http.mock.calls[0][0];
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

		expect(golbat.http).not.toHaveBeenCalled();
		expect(golbat.grpcOrHttp).not.toHaveBeenCalled();
		expect(result).toEqual({ data: [], examined: 0 });
	});

	it("maps player ids to trainer names and marks the pokemon shiny", async () => {
		golbat.http.mockResolvedValue(
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
		golbat.http.mockResolvedValue(
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
		golbat.http.mockResolvedValue(scanResponse([]));

		await new PokemonQuery().query(
			bounds,
			filter({ personalShiny: true, personalShinyTrainers: ["link-p2"] }, { personalShiny: true }),
			null,
			undefined,
			undefined,
			context(everywhere, { p1: "Ash", p2: "Misty" })
		);

		const body: PokemonScanBody = golbat.http.mock.calls[0][0];
		expect(body.annotate_for).toEqual(["p1", "p2"]);
		expect(body.filters[0].shiny_for).toEqual(["p2"]);
		expect(body.filters[1].shiny_for).toEqual(["p1", "p2"]);
	});

	it("drops a filterset whose trainer is no longer linked instead of matching everyone", async () => {
		golbat.http.mockResolvedValue(scanResponse([]));

		const result = await new PokemonQuery().query(
			bounds,
			filter({ personalShiny: true, personalShinyTrainers: ["link-gone"] }),
			null,
			undefined,
			undefined,
			context(everywhere, { p1: "Ash" })
		);

		expect(golbat.http).not.toHaveBeenCalled();
		expect(result).toEqual({ data: [], examined: 0 });
	});

	it("returns linked trainer ids and keeps only mons shiny for the chosen trainer", async () => {
		golbat.http.mockResolvedValue(
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
		golbat.http.mockResolvedValue(
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

		const body: PokemonScanBody = golbat.http.mock.calls[0][0];
		expect(body.filters[0].shiny_for).toEqual(["p2", "p3"]);
		expect(result.data.map((p) => p.id)).toEqual(["b", "c"]);
	});
});
