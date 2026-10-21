import type { FilterPokemon } from "@/lib/features/filters/filters";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { scanViaGrpcOrHttp } from "@/lib/server/api/golbat/grpc";
import { getSinglePokemon } from "@/lib/server/api/golbat/http";
import { respond } from "@/lib/server/api/respond";
import type { ServerConfig } from "@/lib/services/config/configTypes";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import { Features } from "@/lib/utils/features";
import { decode } from "@msgpack/msgpack";
import { beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({
	encounterIdObfuscation: undefined as ServerConfig["encounterIdObfuscation"]
}));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => config }));
vi.mock("@/lib/server/db/external/internalQuery", () => ({ query: vi.fn() }));
vi.mock("@/lib/server/api/golbat/http", () => ({
	getSinglePokemon: vi.fn(),
	getMultiplePokemon: vi.fn(),
	getUpdatedAfter: () => undefined
}));
vi.mock("@/lib/server/api/golbat/grpc", () => ({
	grpcScanPokemon: vi.fn(),
	scanViaGrpcOrHttp: vi.fn()
}));
vi.mock("@/lib/features/activeSearch.svelte", () => ({}));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({
	isCurrentSelectedOverwrite: () => false
}));
vi.mock("@/lib/services/userSettings.svelte", () => ({}));
vi.mock("@/lib/services/masterfile", () => ({ getMasterPokemon: () => ({ defaultFormId: 0 }) }));

const bounds = { minLat: 0, minLon: 0, maxLat: 5, maxLon: 5 };
const filter: FilterPokemon = { category: "pokemon", enabled: true, filters: [] };
const pokemon: MinMapObject<PokemonData> = {
	id: "18446744073709551615",
	lat: 1,
	lon: 2,
	pokemon_id: 25,
	form: 0,
	updated: 100,
	cp: 500,
	iv: 100
};

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	config.encounterIdObfuscation = { enabled: true, secret: "ab".repeat(32) };
	vi.mocked(scanViaGrpcOrHttp).mockResolvedValue({
		pokemon: [pokemon],
		examined: 1,
		skipped: 0,
		total: 1,
		limit_reached: false
	});
	vi.mocked(getSinglePokemon).mockResolvedValue(pokemon as PokemonData);
});

describe("Pokémon encounter IDs at the client boundary", () => {
	it.each(["application/json", "application/msgpack"])(
		"hides both id and mapId in %s map results, including delta updates",
		async (accept) => {
			const { PokemonQuery } = await import("./queryPokemon");
			const query = new PokemonQuery();
			const result = await query.getMultiple(bounds, filter, null);
			const delta = await query.getMultiple(bounds, filter, null, 99);
			const token = result.data[0].id;

			expect(token).toMatch(/^pid_[A-Za-z0-9_-]{32}$/);
			expect(result.data[0].mapId).toBe(`pokemon-${token}`);
			expect(delta.data[0].id).toBe(token);
			expect(delta.data[0].mapId).toBe(result.data[0].mapId);
			expect(pokemon.id).toBe("18446744073709551615");

			const response = respond(
				new Request("http://localhost/api/pokemon", { headers: { Accept: accept } }),
				result
			);
			const body =
				accept === "application/json"
					? await response.json()
					: decode(new Uint8Array(await response.arrayBuffer()));
			expect(body).toMatchObject({ data: [{ id: token, mapId: `pokemon-${token}` }] });
			expect(JSON.stringify(body)).not.toContain(pokemon.id);
		}
	);

	it("decrypts single-object requests and re-encrypts results used by APIs, shares, and thumbnails", async () => {
		const { PokemonQuery } = await import("./queryPokemon");
		const query = new PokemonQuery();
		const bulk = await query.getMultiple(bounds, filter, null);
		const token = bulk.data[0].id;
		const thisFetch = vi.fn<typeof fetch>();
		const single = await query.getSingle(token, thisFetch);

		expect(getSinglePokemon).toHaveBeenCalledExactlyOnceWith(pokemon.id, thisFetch);
		expect(single).toEqual(bulk.data[0]);
		expect(JSON.stringify(single)).not.toContain(pokemon.id);
	});

	it("ignores raw and tampered IDs without contacting Golbat", async () => {
		const { PokemonQuery } = await import("./queryPokemon");
		const query = new PokemonQuery();
		const bulk = await query.getMultiple(bounds, filter, null);
		const encrypted = Buffer.from(bulk.data[0].id.slice(4), "base64url");
		encrypted[0] ^= 1;
		for (const invalid of [pokemon.id, "invalid", "pid_" + encrypted.toString("base64url")]) {
			await expect(query.getSingle(invalid)).resolves.toBeUndefined();
		}
		expect(getSinglePokemon).not.toHaveBeenCalled();
	});

	it("still strips restricted stats from encrypted single-object responses", async () => {
		const { PokemonQuery } = await import("./queryPokemon");
		const query = new PokemonQuery();
		const bulk = await query.getMultiple(bounds, filter, null);
		const context = new FeaturePermissionContext({ everywhere: [Features.POKEMON], areas: [] }, [
			Features.POKEMON,
			Features.POKEMON_IV,
			Features.POKEMON_PVP
		]);
		const single = await query.getSingle(bulk.data[0].id, undefined, context);
		expect(single?.id).toBe(bulk.data[0].id);
		expect(single?.cp).toBeUndefined();
		expect(single?.iv).toBeUndefined();
	});

	it.each([undefined, { enabled: false }])(
		"keeps raw IDs in requests and responses when disabled (%j)",
		async (options) => {
			config.encounterIdObfuscation = options;
			const { PokemonQuery } = await import("./queryPokemon");
			const query = new PokemonQuery();
			const bulk = await query.getMultiple(bounds, filter, null);
			const single = await query.getSingle(pokemon.id);
			expect(getSinglePokemon).toHaveBeenCalledExactlyOnceWith(pokemon.id, undefined);
			for (const item of [single, ...bulk.data]) {
				expect(item).toMatchObject({
					id: pokemon.id,
					mapId: `pokemon-${pokemon.id}`,
					type: MapObjectType.POKEMON
				});
			}
		}
	);
});
