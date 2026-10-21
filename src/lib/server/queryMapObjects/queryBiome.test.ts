import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { biomesProvider } from "@/lib/server/provider/biomesProvider";
import { BiomeQuery } from "@/lib/server/queryMapObjects/queryBiome";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { getS2CellCenter } from "@/lib/utils/s2";
import { bboxPolygon } from "@turf/turf";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/provider/biomesProvider", () => ({
	biomesProvider: {
		get enabled() {
			return true;
		},
		getProfiles: vi.fn()
	}
}));
vi.mock("@/lib/server/db/external/internalQuery", () => ({ query: vi.fn() }));
vi.mock("@/lib/server/api/rateLimit", () => ({ requestLimits: { biome: 2000 } }));

const id = "5160937946483785728";
const center = getS2CellCenter(BigInt(id));
const bounds = {
	minLat: center.lat - 0.00001,
	maxLat: center.lat + 0.00001,
	minLon: center.lon - 0.00001,
	maxLon: center.lon + 0.00001
};
const profile = {
	cell_id: id,
	fields: { landcover: 5 }
};

beforeEach(() => {
	vi.spyOn(biomesProvider, "enabled", "get").mockReturnValue(true);
	vi.mocked(biomesProvider.getProfiles).mockReset().mockResolvedValue([profile]);
});

describe("BiomeQuery", () => {
	it("returns captured level 16 map objects with precise string IDs and real centers", async () => {
		const result = await new BiomeQuery().getMultiple(bounds, undefined, null);
		expect(result.data).toEqual([
			{ id, mapId: `biome-${id}`, type: MapObjectType.BIOME, ...center, profile }
		]);
		expect(biomesProvider.getProfiles).toHaveBeenCalledWith([id]);
	});

	it("accepts coordinate bounds carried alongside map request metadata", async () => {
		const request = {
			...bounds,
			filter: { category: "biome", enabled: true, filters: [] },
			filterHash: "hash"
		};
		expect((await new BiomeQuery().query(request, undefined, null)).data).toHaveLength(1);
	});

	it("omits profiles with unknown, unavailable or conflicting geography", async () => {
		const query = new BiomeQuery();
		vi.mocked(biomesProvider.getProfiles).mockResolvedValue([{ ...profile, fields: null }]);
		expect(await query.query(bounds, undefined, null)).toEqual({ data: [], examined: 1 });
		expect(await query.querySingle(id)).toEqual([]);
	});

	it("bounds zoomed-out queries without making any upstream requests", async () => {
		const result = await new BiomeQuery().query(
			{ minLat: -85, maxLat: 85, minLon: -180, maxLon: 180 },
			undefined,
			null
		);
		expect(result).toEqual({ data: [], examined: 2000, limitReached: true });
		expect(biomesProvider.getProfiles).not.toHaveBeenCalled();
	});

	it("does not request cells outside the permitted polygon or permission context", async () => {
		vi.mocked(biomesProvider.getProfiles).mockResolvedValue([]);
		const query = new BiomeQuery();
		await query.query(bounds, undefined, bboxPolygon([0, 0, 1, 1]));
		expect(biomesProvider.getProfiles).toHaveBeenLastCalledWith([]);
		const denied = new FeaturePermissionContext({ everywhere: [], areas: [] }, [
			MapObjectType.BIOME
		]);
		await query.query(bounds, undefined, null, undefined, undefined, denied);
		expect(biomesProvider.getProfiles).toHaveBeenLastCalledWith([]);
	});

	it("validates single cell IDs before looking up discoveries", async () => {
		const query = new BiomeQuery();
		expect(await query.querySingle("invalid")).toEqual([]);
		expect(biomesProvider.getProfiles).not.toHaveBeenCalled();
		expect(await query.querySingle(id)).toEqual([{ id, ...center, profile }]);
	});

	it("rejects invalid bounds before building the grid", async () => {
		await expect(
			new BiomeQuery().query({ ...bounds, minLat: 100 }, undefined, null)
		).rejects.toMatchObject({ status: 400 });
		expect(biomesProvider.getProfiles).not.toHaveBeenCalled();
	});

	it("returns no map data or direct-link object when biomes are disabled", async () => {
		vi.spyOn(biomesProvider, "enabled", "get").mockReturnValue(false);
		const query = new BiomeQuery();
		expect(await query.query(bounds, undefined, null)).toEqual({ data: [], examined: 0 });
		expect(await query.querySingle(id)).toEqual([]);
		expect(biomesProvider.getProfiles).not.toHaveBeenCalled();
	});
});
