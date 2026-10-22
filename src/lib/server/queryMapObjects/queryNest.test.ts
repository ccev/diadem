import { beforeEach, describe, expect, it, vi } from "vitest";
import { booleanPointInPolygon, multiPolygon, point, polygon } from "@turf/turf";
import type { FilterNest } from "@/lib/features/filters/filters";

const mocks = vi.hoisted(() => ({
	config: { golbat: {}, talonflame: { url: "http://talon:9042" } as { url: string } | undefined },
	api: vi.fn(),
	sql: vi.fn()
}));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => mocks.config }));
vi.mock("@/lib/server/db/external/internalQuery", () => ({ query: mocks.sql }));
vi.mock("@/lib/server/api/talonflame", () => ({ fetchTalonflame: mocks.api }));
vi.mock("@/lib/features/filterLogic/nest", () => ({ shouldDisplayNest: () => true }));
vi.mock("@/lib/utils/pokemonUtils", () => ({
	getNormalizedForm: (_id: number, form: number) => form
}));

import { NestQuery } from "./queryNest";

const bounds = { minLat: 53.55, minLon: 9.97, maxLat: 53.57, maxLon: 9.99 };
const geometry = polygon([
	[
		[9.97, 53.55],
		[9.99, 53.55],
		[9.99, 53.57],
		[9.97, 53.57],
		[9.97, 53.55]
	]
]).geometry;
const nest = {
	id: "8103463",
	pokemon_id: 16,
	form: 0,
	name: "Planten un Blomen",
	area_name: "Hamburg",
	lat: 53.56,
	lon: 9.98,
	m2: 3000000,
	spawnpoints: 1005,
	last_changed: null,
	geometry
};
const snapshot = { data: [nest], examined: 1, snapshot: true, revision: "revision-1" };

beforeEach(() => {
	vi.clearAllMocks();
	mocks.config.talonflame = { url: "http://talon:9042" };
	mocks.api.mockResolvedValue(snapshot);
});

describe("NestQuery API backend", () => {
	it("uses legacy SQL when no Talonflame URL is configured", async () => {
		mocks.config.talonflame = undefined;
		mocks.sql.mockResolvedValue([]);
		await new NestQuery().query(bounds, undefined, null, 100);
		expect(mocks.sql.mock.calls[0][0]).toContain("FROM nests");
		expect(mocks.sql.mock.calls[0][0]).toContain("updated > ?");
		expect(mocks.api).not.toHaveBeenCalled();
	});

	it("fetches finished geometry without SQL, membership reads or species inference", async () => {
		const result = await new NestQuery().query(bounds, undefined, null, 2000000000);
		expect(mocks.sql).not.toHaveBeenCalled();
		expect(mocks.api).toHaveBeenCalledTimes(1);
		const params = new URLSearchParams(mocks.api.mock.calls[0][0].slice(1));
		expect(params.get("bbox")).toBe("9.97,53.55,9.99,53.57");
		expect(params.has("since")).toBe(false);
		expect(result).toMatchObject({ examined: 1, snapshot: true, revision: "revision-1" });
		expect(result.data[0]).toMatchObject({
			id: nest.id,
			pokemon_id: 16,
			spawnpoints: 1005,
			updated: null
		});
		expect(result.data[0].polygon).toEqual([
			geometry.coordinates.map((ring) => ring.map(([x, y]) => ({ x, y })))
		]);
	});

	it("bounds the upstream query and filters species before transfer", async () => {
		await new NestQuery().query(
			bounds,
			{
				enabled: true,
				filters: [
					{
						enabled: true,
						pokemon: [
							{ pokemon_id: 276, form: 0 },
							{ pokemon_id: 16, form: 0 }
						]
					}
				]
			} as FilterNest,
			null,
			undefined,
			10
		);
		const params = new URLSearchParams(mocks.api.mock.calls[0][0].slice(1));
		expect(params.get("limit")).toBe("10");
		expect(params.get("pokemon")).toBe("16,276");
	});

	it("propagates explicit snapshot and revision through final map-object processing", async () => {
		const result = await new NestQuery().getMultiple(bounds, undefined, null, 123);
		expect(result.snapshot).toBe(true);
		expect(result.revision).toBe(snapshot.revision);
		expect(result.data[0].mapId).toBe("nest-8103463");
	});

	it("represents withdrawals with an empty complete snapshot", async () => {
		mocks.api.mockResolvedValue({ ...snapshot, revision: "revision-2", data: [], examined: 0 });
		expect(await new NestQuery().getMultiple(bounds, undefined, null, 123)).toEqual({
			revision: "revision-2",
			snapshot: true,
			data: [],
			examined: 0
		});
	});

	it("retains limits and snapshot semantics without processing geometry", async () => {
		mocks.api.mockResolvedValue({ ...snapshot, data: [], examined: 10, limitReached: true });
		expect(await new NestQuery().getMultiple(bounds, undefined, null)).toEqual({
			data: [],
			examined: 10,
			limitReached: true,
			snapshot: true,
			revision: snapshot.revision
		});
	});

	it("clips to user permissions and moves the marker inside the permitted piece", async () => {
		const permission = polygon([
			[
				[9.97, 53.55],
				[9.975, 53.55],
				[9.975, 53.57],
				[9.97, 53.57],
				[9.97, 53.55]
			]
		]);
		const [result] = (await new NestQuery().query(bounds, undefined, permission)).data;
		expect(booleanPointInPolygon(point([result.lon, result.lat]), permission)).toBe(true);
		const clipped = multiPolygon(
			(result.polygon as { x: number; y: number }[][][]).map((rings) =>
				rings.map((ring) => ring.map(({ x, y }) => [x, y]))
			)
		);
		expect(booleanPointInPolygon(point([9.98, 53.56]), clipped)).toBe(false);
		expect(nest.lon).toBe(9.98); // shared API cache was not modified
	});

	it("supports direct negative-ID links via the same API", async () => {
		mocks.api.mockResolvedValue({ ...snapshot, data: [{ ...nest, id: "-375", pokemon_id: 769 }] });
		const query = new NestQuery();
		const result = await query.querySingle("-375");
		expect(mocks.api.mock.calls[0][0]).toBe("?id=-375");
		expect(result[0].id).toBe("-375");
		expect(mocks.sql).not.toHaveBeenCalled();
	});
});
