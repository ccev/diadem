import type { AnyFilter } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import * as golbat from "@/lib/server/api/golbatApi";
import { ApiGymQuery } from "@/lib/server/queryMapObjects/queryGymApi";
import { ApiStationQuery } from "@/lib/server/queryMapObjects/queryStationApi";
import { GymQuery } from "@/lib/server/queryMapObjects/queryGym";
import { PokestopQuery } from "@/lib/server/queryMapObjects/queryPokestop";
import { StationQuery } from "@/lib/server/queryMapObjects/queryStation";
import { fortTypes, queryFortsCombined } from "@/lib/server/queryMapObjects/queryMapObjects";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features/activeSearch.svelte", () => ({}));
vi.mock("@/lib/features/masterStats.svelte", () => ({}));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({}));
vi.mock("@/lib/services/userSettings.svelte", () => ({}));
vi.mock("@/lib/services/ingameLocale", () => ({}));
vi.mock("@/lib/services/uicons.svelte", () => ({}));
vi.mock("$lib/features/masterStats.svelte", () => ({}));
vi.mock("$lib/server/queryMapObjects/invasionRewards", () => ({}));
vi.mock("@/lib/services/masterfile", () => ({ getMasterPokemon: () => ({ defaultFormId: 0 }) }));

const fortApi = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/lib/server/api/golbatFortApi", () => ({
	isFortApiEnabled: () => fortApi.enabled,
	getFortApiScanLimit: (limit: number) => Math.min(limit, 9000)
}));

afterEach(() => {
	vi.restoreAllMocks();
	fortApi.enabled = true;
});

const bounds = { minLat: 0, minLon: 0, maxLat: 5, maxLon: 5 };
const wider = { minLat: -1, minLon: 0, maxLat: 5, maxLon: 6 };
const gym = { id: "gym", lat: 1, lon: 2, updated: 100, first_seen_timestamp: 50, deleted: false };
const station = {
	id: "station",
	lat: 1,
	lon: 2,
	name: "S",
	cell_id: 0n,
	cooldown_complete: 0,
	updated: 100,
	is_inactive: false,
	is_battle_available: true
};
const emptyStats = { examined: 0, limit_reached: false };
const entry = (limit = 10000) => ({ filter: undefined, bounds, polygon: null, limit });

describe("queryFortsCombined", () => {
	it("issues one scan with a group per type, the union bbox and per-type limits, then post-processes each slice", async () => {
		const scan = vi.spyOn(golbat, "scanForts").mockResolvedValue({
			gyms: [gym],
			pokestops: [],
			stations: [station],
			examined: 30,
			skipped: 0,
			total: 30,
			limit_reached: false,
			gyms_stats: { examined: 12, limit_reached: false },
			pokestops_stats: { examined: 8, limit_reached: false },
			stations_stats: { examined: 10, limit_reached: false }
		});

		const results = await queryFortsCombined({
			[MapObjectType.GYM]: entry(),
			[MapObjectType.POKESTOP]: { ...entry(500), bounds: wider },
			[MapObjectType.STATION]: entry()
		});

		expect(scan).toHaveBeenCalledTimes(1);
		const body = scan.mock.calls[0][0];
		expect(body.min).toEqual({ latitude: -1, longitude: 0 });
		expect(body.max).toEqual({ latitude: 5, longitude: 6 });
		expect(body.with_incidents).toBe(true);
		expect(body.gyms).toEqual({ filters: [], limit: 9000 });
		expect(body.pokestops).toEqual({ filters: [], limit: 501 });
		expect(body.stations).toEqual({ filters: [], limit: 9000 });
		// the top-level limit is clamped to Golbat's max_fort_results, not the sum of the groups
		expect(body.limit).toBe(9000);

		expect(results[MapObjectType.GYM]).toMatchObject({ examined: 12 });
		expect(results[MapObjectType.GYM]?.data[0]).toMatchObject({
			type: "gym",
			id: "gym",
			deleted: 0
		});
		expect(results[MapObjectType.POKESTOP]).toEqual({ examined: 8, data: [] });
		expect(results[MapObjectType.STATION]?.data[0]).toMatchObject({
			type: "station",
			id: "station"
		});
		expect(results[MapObjectType.STATION]?.examined).toBe(10);
	});

	it("omits types that were not requested and skips with_incidents without pokestops", async () => {
		const scan = vi.spyOn(golbat, "scanForts").mockResolvedValue({
			gyms: [],
			pokestops: [],
			stations: [],
			examined: 0,
			skipped: 0,
			total: 0,
			limit_reached: false,
			gyms_stats: emptyStats,
			pokestops_stats: emptyStats,
			stations_stats: emptyStats
		});
		const results = await queryFortsCombined({ [MapObjectType.GYM]: entry() });
		const body = scan.mock.calls[0][0];
		expect(body.pokestops).toBeUndefined();
		expect(body.stations).toBeUndefined();
		expect(body.with_incidents).toBe(false);
		expect(Object.keys(results)).toEqual([MapObjectType.GYM]);
	});

	it("retries every scanned type when the top-level and a per-type limit flag are set", async () => {
		vi.spyOn(golbat, "scanForts").mockResolvedValue({
			gyms: [gym],
			pokestops: [],
			stations: [],
			examined: 0,
			skipped: 0,
			total: 0,
			limit_reached: true,
			gyms_stats: { examined: 5, limit_reached: false },
			pokestops_stats: { examined: 9000, limit_reached: true },
			stations_stats: emptyStats
		});
		const sqlPokestops = vi
			.spyOn(PokestopQuery.prototype, "getMultiple")
			.mockResolvedValue({ examined: 3, data: [] });
		const sqlGyms = vi
			.spyOn(GymQuery.prototype, "getMultiple")
			.mockResolvedValue({ examined: 4, data: [] });

		const results = await queryFortsCombined({
			[MapObjectType.GYM]: entry(),
			[MapObjectType.POKESTOP]: entry()
		});

		expect(sqlPokestops).toHaveBeenCalledTimes(1);
		expect(sqlGyms).toHaveBeenCalledTimes(1);
		expect(results[MapObjectType.POKESTOP]).toEqual({ examined: 3, data: [] });
		expect(results[MapObjectType.GYM]).toEqual({ examined: 4, data: [] });
	});

	it("answers a disabled filter and a match-nothing pokestop filter without scanning them", async () => {
		const scan = vi.spyOn(golbat, "scanForts").mockResolvedValue({
			gyms: [gym],
			pokestops: [],
			stations: [],
			examined: 1,
			skipped: 0,
			total: 1,
			limit_reached: false,
			gyms_stats: { examined: 1, limit_reached: false },
			pokestops_stats: emptyStats,
			stations_stats: emptyStats
		});
		const disabled = { enabled: false } as unknown as AnyFilter;
		// pokestop filter with every sub-filter off: buildPokestopDnfFilters returns null
		const nothing = {
			enabled: true,
			pokestopPlain: { enabled: false },
			lure: { enabled: false, filters: [] },
			quest: { enabled: false, filters: [] },
			invasion: { enabled: false, filters: [] },
			goldPokestop: { enabled: false },
			kecleon: { enabled: false },
			contest: { enabled: false, filters: [] }
		} as unknown as AnyFilter;

		const results = await queryFortsCombined({
			[MapObjectType.GYM]: entry(),
			[MapObjectType.POKESTOP]: { ...entry(), filter: nothing },
			[MapObjectType.STATION]: { ...entry(), filter: disabled }
		});

		const body = scan.mock.calls[0][0];
		expect(body.pokestops).toBeUndefined();
		expect(body.stations).toBeUndefined();
		expect(results[MapObjectType.POKESTOP]).toEqual({ examined: 0, data: [] });
		expect(results[MapObjectType.STATION]).toEqual({ examined: 0, data: [] });
		expect(results[MapObjectType.GYM]?.data).toHaveLength(1);
	});

	it("runs the SQL classes in parallel when the fort API is off", async () => {
		const gymSql = vi
			.spyOn(GymQuery.prototype, "getMultiple")
			.mockResolvedValue({ examined: 1, data: [] });
		const stationSql = vi
			.spyOn(StationQuery.prototype, "getMultiple")
			.mockResolvedValue({ examined: 2, data: [] });
		const scan = vi.spyOn(golbat, "scanForts");

		fortApi.enabled = false;
		const results = await queryFortsCombined({
			[MapObjectType.GYM]: entry(),
			[MapObjectType.STATION]: entry()
		});
		expect(scan).not.toHaveBeenCalled();
		expect(gymSql).toHaveBeenCalledTimes(1);
		expect(stationSql).toHaveBeenCalledTimes(1);
		expect(results[MapObjectType.GYM]).toEqual({ examined: 1, data: [] });
		expect(results[MapObjectType.STATION]).toEqual({ examined: 2, data: [] });
	});

	it("answers a disabled filter without querying it, with the fort API off", async () => {
		const gymSql = vi.spyOn(GymQuery.prototype, "getMultiple");
		const stationSql = vi
			.spyOn(StationQuery.prototype, "getMultiple")
			.mockResolvedValue({ examined: 2, data: [] });
		const disabled = { enabled: false } as unknown as AnyFilter;

		fortApi.enabled = false;
		const results = await queryFortsCombined({
			[MapObjectType.GYM]: { ...entry(), filter: disabled },
			[MapObjectType.STATION]: entry()
		});

		expect(gymSql).not.toHaveBeenCalled();
		expect(results[MapObjectType.GYM]).toEqual({ examined: 0, data: [] });
		expect(stationSql).toHaveBeenCalledTimes(1);
		expect(results[MapObjectType.STATION]).toEqual({ examined: 2, data: [] });
	});

	it.each([false, true])(
		"falls back to SQL for every scanned type at the overall limit with per-type limit reached: %s",
		async (perTypeCapped) => {
			const scan = vi.spyOn(golbat, "scanForts").mockResolvedValue({
				gyms: [gym],
				pokestops: [],
				stations: perTypeCapped ? [] : [station],
				examined: 9000,
				skipped: 0,
				total: 9000,
				limit_reached: true,
				gyms_stats: { examined: perTypeCapped ? 9000 : 4000, limit_reached: perTypeCapped },
				pokestops_stats: { examined: perTypeCapped ? 0 : 4000, limit_reached: false },
				stations_stats: { examined: perTypeCapped ? 0 : 1000, limit_reached: false }
			});
			const gymSql = vi
				.spyOn(GymQuery.prototype, "getMultiple")
				.mockResolvedValue({ examined: 1, data: [] });
			const pokestopSql = vi
				.spyOn(PokestopQuery.prototype, "getMultiple")
				.mockResolvedValue({ examined: 2, data: [] });
			const stationSql = vi
				.spyOn(StationQuery.prototype, "getMultiple")
				.mockResolvedValue({ examined: 3, data: [] });

			const results = await queryFortsCombined({
				[MapObjectType.GYM]: entry(),
				[MapObjectType.POKESTOP]: entry(),
				[MapObjectType.STATION]: entry()
			});

			expect(scan).toHaveBeenCalledTimes(1);
			expect(gymSql).toHaveBeenCalledTimes(1);
			expect(pokestopSql).toHaveBeenCalledTimes(1);
			expect(stationSql).toHaveBeenCalledTimes(1);
			expect(results[MapObjectType.GYM]).toEqual({ examined: 1, data: [] });
			expect(results[MapObjectType.POKESTOP]).toEqual({ examined: 2, data: [] });
			expect(results[MapObjectType.STATION]).toEqual({ examined: 3, data: [] });
		}
	);

	it("falls back to the per-type fort API classes, not SQL, when the combined scan fails", async () => {
		vi.spyOn(golbat, "scanForts").mockRejectedValue(new Error("boom"));
		const gymApi = vi
			.spyOn(ApiGymQuery.prototype, "getMultiple")
			.mockResolvedValue({ examined: 1, data: [] });
		const stationApi = vi
			.spyOn(ApiStationQuery.prototype, "getMultiple")
			.mockResolvedValue({ examined: 2, data: [] });
		const gymSql = vi.spyOn(GymQuery.prototype, "getMultiple");

		const results = await queryFortsCombined({
			[MapObjectType.GYM]: entry(),
			[MapObjectType.STATION]: entry()
		});

		expect(gymApi).toHaveBeenCalledTimes(1);
		expect(stationApi).toHaveBeenCalledTimes(1);
		expect(gymSql).not.toHaveBeenCalled();
		expect(results[MapObjectType.GYM]).toEqual({ examined: 1, data: [] });
		expect(results[MapObjectType.STATION]).toEqual({ examined: 2, data: [] });
	});

	it("leaves out a type whose query failed and keeps the others", async () => {
		vi.spyOn(golbat, "scanForts").mockResolvedValue({
			gyms: [gym],
			pokestops: [],
			stations: [],
			examined: 5,
			skipped: 0,
			total: 5,
			limit_reached: false,
			gyms_stats: { examined: 5, limit_reached: false },
			pokestops_stats: { examined: 9000, limit_reached: true },
			stations_stats: emptyStats
		});
		vi.spyOn(PokestopQuery.prototype, "getMultiple").mockRejectedValue(new Error("db down"));

		const results = await queryFortsCombined({
			[MapObjectType.GYM]: entry(),
			[MapObjectType.POKESTOP]: entry()
		});

		expect(results[MapObjectType.GYM]?.data).toHaveLength(1);
		expect(MapObjectType.POKESTOP in results).toBe(false);
	});

	it("exposes the fort types in scan order", () => {
		expect(fortTypes).toEqual([MapObjectType.GYM, MapObjectType.POKESTOP, MapObjectType.STATION]);
	});
});
