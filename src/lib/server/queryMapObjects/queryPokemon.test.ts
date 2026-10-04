import { beforeEach, describe, expect, it, vi } from "vitest";
import { bboxPolygon, multiPolygon, polygon as turfPolygon } from "@turf/turf";
import { PokemonQuery } from "@/lib/server/queryMapObjects/queryPokemon";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { Features, featureFamily } from "@/lib/utils/features";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { FilterPokemon } from "@/lib/features/filters/filters";
import type { PokemonScanBody } from "@/lib/server/api/golbat/types";
import { scanViaGrpcOrHttp } from "@/lib/server/api/golbat/grpc";

vi.mock("@/lib/server/api/golbat/grpc", () => ({
	scanViaGrpcOrHttp: vi.fn(),
	grpcScanPokemon: vi.fn()
}));
vi.mock("@/lib/server/api/golbat/http", () => ({
	getMultiplePokemon: vi.fn(),
	getSinglePokemon: vi.fn()
}));
vi.mock("@/lib/server/api/rateLimit", () => ({ requestLimits: { pokemon: 10000 } }));
vi.mock("@/lib/server/db/external/internalQuery", () => ({ query: vi.fn() }));
vi.mock("@/lib/features/activeSearch.svelte", () => ({}));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({
	isCurrentSelectedOverwrite: () => false
}));
vi.mock("@/lib/services/userSettings.svelte", () => ({}));
vi.mock("@/lib/services/masterfile", () => ({ getMasterPokemon: () => ({ defaultFormId: 0 }) }));

const bounds = { minLat: 0, minLon: 0, maxLat: 10, maxLon: 10 };
const area = bboxPolygon([0, 0, 10, 10]);
const hundoFilter: FilterPokemon = {
	category: "pokemon",
	enabled: true,
	filters: [
		{
			id: "hundos",
			enabled: true,
			title: { message: "hundos" },
			icon: { isUserSelected: false },
			iv: { min: 100, max: 100 }
		}
	]
};
let records: MinMapObject<PokemonData>[];
let scannerCap: number;
const mon = (id: string, lon: number, iv = 100): MinMapObject<PokemonData> => ({
	id,
	lon,
	lat: 1,
	pokemon_id: 25,
	form: 0,
	iv,
	updated: 100
});

beforeEach(() => {
	vi.clearAllMocks();
	records = [];
	scannerCap = Infinity;
	vi.mocked(scanViaGrpcOrHttp).mockImplementation(async (_type, scan) => {
		const body = scan as PokemonScanBody;
		const inBounds = records.filter(
			(p) =>
				p.lon >= body.min.longitude &&
				p.lon <= body.max.longitude &&
				p.lat >= body.min.latitude &&
				p.lat <= body.max.latitude
		);
		const matched = inBounds.filter((p) =>
			body.filters.some((f) => !f.iv || (p.iv! >= f.iv.min && p.iv! <= f.iv.max))
		);
		const cap = Math.min(body.limit, scannerCap);
		return {
			pokemon: matched.slice(0, cap),
			examined: inBounds.length,
			skipped: 0,
			total: records.length,
			limit_reached: matched.length >= cap
		} as never;
	});
});

describe("permission-aware Pokemon limits", () => {
	it("pushes hundo constraints for a user whose IV permission covers their area (#187)", async () => {
		const context = new FeaturePermissionContext(
			{
				everywhere: [],
				areas: [{ name: "area", polygon: area.geometry, features: [Features.POKEMON_IV] }]
			},
			featureFamily[MapObjectType.POKEMON]
		);
		records = [
			mon("hundo", 1),
			...Array.from({ length: 20 }, (_, i) => mon(String(i), i / 10, 50))
		];
		const result = await new PokemonQuery().query(bounds, hundoFilter, area, undefined, 2, context);
		expect(result.data.map((p) => p.id)).toEqual(["hundo"]);
		expect(scanViaGrpcOrHttp).toHaveBeenCalledOnce();
		expect(vi.mocked(scanViaGrpcOrHttp).mock.calls[0][1]).toMatchObject({
			filters: [{ iv: { min: 100, max: 100 } }]
		});
	});

	it("does not count records in gaps between permitted areas (#182)", async () => {
		const permitted = multiPolygon([
			bboxPolygon([0, 0, 2, 2]).geometry.coordinates,
			bboxPolygon([8, 0, 10, 2]).geometry.coordinates
		]);
		records = [mon("left", 1), mon("gap-a", 3), mon("gap-b", 5), mon("gap-c", 7), mon("right", 9)];
		const result = await new PokemonQuery().query(bounds, undefined, permitted, undefined, 2);
		expect(result.limitReached).toBeUndefined();
		expect(result.data.map((p) => p.id).sort()).toEqual(["left", "right"]);
		expect(vi.mocked(scanViaGrpcOrHttp).mock.calls.length).toBeGreaterThan(1);
	});

	it("strips stats and rechecks filters before counting mixed permission tiers", async () => {
		const context = new FeaturePermissionContext(
			{
				everywhere: [Features.POKEMON],
				areas: [
					{
						name: "iv",
						features: [Features.POKEMON_IV],
						polygon: bboxPolygon([0, 0, 2, 2]).geometry
					}
				]
			},
			featureFamily[MapObjectType.POKEMON]
		);
		records = [mon("allowed", 1), mon("hidden-a", 3), mon("hidden-b", 5), mon("hidden-c", 7)];
		const result = await new PokemonQuery().query(bounds, hundoFilter, null, undefined, 1, context);
		expect(result.data.map((p) => p.id)).toEqual(["allowed"]);
		expect(result.limitReached).toBeUndefined();
		expect(vi.mocked(scanViaGrpcOrHttp).mock.calls[0][1]).toMatchObject({ filters: [{}] });
	});

	it("excludes polygon holes even when they contain most scan results", async () => {
		const permitted = turfPolygon([
			area.geometry.coordinates[0],
			bboxPolygon([2, 0.5, 8, 2]).geometry.coordinates[0]
		]);
		records = [mon("visible", 1), mon("hole-a", 3), mon("hole-b", 5), mon("hole-c", 7)];
		const result = await new PokemonQuery().query(bounds, undefined, permitted, undefined, 1);
		expect(result.data.map((p) => p.id)).toEqual(["visible"]);
	});

	it("deduplicates split boundaries and handles a lower scanner cap", async () => {
		scannerCap = 2;
		records = [mon("left", 1), mon("boundary", 5), mon("right", 9)];
		const result = await new PokemonQuery().query(bounds, undefined, null, undefined, 3);
		expect(result.data.map((p) => p.id).sort()).toEqual(["boundary", "left", "right"]);
		expect(result.limitReached).toBeUndefined();
	});

	it("still hides genuinely excessive results, including during delta refreshes", async () => {
		records = [mon("one", 1), mon("two", 3), mon("three", 5)];
		expect(await new PokemonQuery().query(bounds, undefined, area, 200, 2)).toEqual({
			data: [],
			examined: 2,
			limitReached: true
		});
	});

	it("applies the delta only after matching", async () => {
		records = [mon("old", 1), { ...mon("fresh", 9), updated: 200 }];
		const result = await new PokemonQuery().query(bounds, undefined, area, 150, 2);
		expect(result.data.map((p) => p.id)).toEqual(["fresh"]);
	});

	it("fails instead of returning incomplete data when a cap cannot be resolved", async () => {
		vi.mocked(scanViaGrpcOrHttp).mockResolvedValue({
			pokemon: [],
			examined: 0,
			total: 0,
			skipped: 0,
			limit_reached: true
		} as never);
		await expect(
			new PokemonQuery().query(bounds, undefined, null, undefined, 2)
		).rejects.toMatchObject({ status: 503 });
		expect(vi.mocked(scanViaGrpcOrHttp).mock.calls.length).toBeLessThanOrEqual(256);
	});
});
