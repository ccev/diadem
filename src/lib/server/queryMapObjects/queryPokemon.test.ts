import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
	scannerCap = 10000;
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
		const cap = Math.min(body.limit || scannerCap, scannerCap);
		return {
			pokemon: matched.slice(0, cap),
			examined: inBounds.length,
			skipped: 0,
			total: records.length,
			limit_reached: matched.length >= cap
		} as never;
	});
});

afterEach(() => {
	expect(vi.mocked(scanViaGrpcOrHttp).mock.calls.length).toBeLessThanOrEqual(1);
});

describe("permission-aware Pokemon limits", () => {
	it.each([false, true])(
		"pushes hundo constraints with global base access: %s (#187)",
		async (globalBase) => {
			const context = new FeaturePermissionContext(
				{
					everywhere: globalBase ? [Features.POKEMON] : [],
					areas: [{ name: "area", polygon: area.geometry, features: [Features.POKEMON_IV] }]
				},
				featureFamily[MapObjectType.POKEMON]
			);
			records = [
				mon("hundo", 1),
				...Array.from({ length: 20 }, (_, i) => mon(String(i), i / 10, 50))
			];
			const result = await new PokemonQuery().query(
				bounds,
				hundoFilter,
				globalBase ? null : area,
				undefined,
				2,
				context
			);
			expect(result.data.map((p) => p.id)).toEqual(["hundo"]);
			expect(scanViaGrpcOrHttp).toHaveBeenCalledOnce();
			expect(vi.mocked(scanViaGrpcOrHttp).mock.calls[0][1]).toMatchObject({
				filters: [{ iv: { min: 100, max: 100 } }]
			});
		}
	);

	it("does not count records in gaps between permitted areas (#182)", async () => {
		const permitted = multiPolygon([
			bboxPolygon([0, 0, 2, 2]).geometry.coordinates,
			bboxPolygon([8, 0, 10, 2]).geometry.coordinates
		]);
		records = [mon("left", 1), mon("gap-a", 3), mon("gap-b", 5), mon("gap-c", 7), mon("right", 9)];
		const result = await new PokemonQuery().query(bounds, undefined, permitted, undefined, 2);
		expect(result.limitReached).toBeUndefined();
		expect(result.data.map((p) => p.id).sort()).toEqual(["left", "right"]);
		expect(result.examined).toBe(2);
		expect(scanViaGrpcOrHttp).toHaveBeenCalledOnce();
		expect(vi.mocked(scanViaGrpcOrHttp).mock.calls[0][1]).toMatchObject({ limit: 0 });
	});

	it("does not charge for returned records outside the permitted polygon", async () => {
		records = [mon("visible", 1), mon("outside", 9)];
		const result = await new PokemonQuery().query(
			bounds,
			undefined,
			bboxPolygon([0, 0, 2, 2]),
			undefined,
			5
		);
		expect(result.data.map((p) => p.id)).toEqual(["visible"]);
		expect(result.examined).toBe(1);
	});

	it.each([
		undefined,
		{ ...hundoFilter, filters: [{ ...hundoFilter.filters[0], iv: undefined, gender: [1] }] }
	])("skips coverage geometry for non-stat filter %#", async (filter) => {
		const context = new FeaturePermissionContext(
			{
				everywhere: [],
				areas: [{ name: "area", polygon: area.geometry, features: [Features.POKEMON_ALL] }]
			},
			featureFamily[MapObjectType.POKEMON]
		);
		const coverage = vi.spyOn(context, "allowedThroughout");
		await new PokemonQuery().query(bounds, filter, area, undefined, 2, context);
		expect(coverage).not.toHaveBeenCalled();
	});

	it("does not scan for a disabled filter", async () => {
		expect(
			await new PokemonQuery().query(bounds, { ...hundoFilter, enabled: false }, area, undefined, 2)
		).toEqual({ data: [], examined: 0 });
		expect(scanViaGrpcOrHttp).not.toHaveBeenCalled();
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

	it("filters a scanner-capped response without retrying or falsely hiding it", async () => {
		scannerCap = 2;
		records = [mon("outside", 5), mon("visible", 1), mon("beyond-cap", 1.5)];
		const result = await new PokemonQuery().query(
			bounds,
			undefined,
			bboxPolygon([0, 0, 2, 2]),
			undefined,
			1
		);
		expect(result.data.map((p) => p.id)).toEqual(["visible"]);
		expect(result.limitReached).toBeUndefined();
	});

	it("filters mega-only PvP matches before counting the display limit", async () => {
		const pvpFilter: FilterPokemon = {
			...hundoFilter,
			filters: [{ ...hundoFilter.filters[0], iv: undefined, pvpRankGreat: { min: 1, max: 10 } }]
		};
		const rank = {
			pokemon: 25,
			pokemon_id: 25,
			form: 0,
			rank: 1,
			cap: 50,
			cp: 1500,
			level: 30,
			percentage: 100,
			value: 1
		};
		records = [
			{ ...mon("visible", 1), pvp: { great: [rank] } },
			...[3, 5, 7].map((lon) => ({
				...mon(`mega-${lon}`, lon),
				pvp: { great: [{ ...rank, evolution: 1 }] }
			}))
		];
		const result = await new PokemonQuery().query(bounds, pvpFilter, area, undefined, 1);
		expect(result.data.map((p) => p.id)).toEqual(["visible"]);
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

	it("does not retry an empty scanner-capped response", async () => {
		vi.mocked(scanViaGrpcOrHttp).mockResolvedValue({
			pokemon: [],
			examined: 0,
			total: 0,
			skipped: 0,
			limit_reached: true
		} as never);
		expect(await new PokemonQuery().query(bounds, undefined, null, undefined, 2)).toEqual({
			data: [],
			examined: 0
		});
		expect(scanViaGrpcOrHttp).toHaveBeenCalledOnce();
	});
});
