import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { rateLimitConsume } from "@/lib/server/api/rateLimit";
import { biomesProvider } from "@/lib/server/provider/biomesProvider";
import type { Perms } from "@/lib/utils/features";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./+server";

vi.mock("@/lib/server/provider/biomesProvider", () => ({
	biomesProvider: {
		get enabled() {
			return true;
		},
		getPools: vi.fn()
	}
}));
vi.mock("@/lib/server/api/rateLimit", () => ({ rateLimitConsume: vi.fn() }));
vi.mock("@/lib/server/api/respond", () => ({
	respond: (_request: Request, data: unknown, init?: ResponseInit) => Response.json(data, init)
}));
vi.mock("@/lib/server/auth/checkIfAuthed", async () => {
	const { hasAnyFeatureAnywhere } = await import("@/lib/services/user/checkPerm");
	return { hasAnyFeatureAnywhereServer: hasAnyFeatureAnywhere };
});

const id = "5160937946483785728";
function request(perms: Perms, cell = id) {
	return GET({
		params: { id: cell },
		locals: { perms, user: null },
		request: new Request(`https://diadem.test/api/biome/${cell}/pools`),
		fetch,
		getClientAddress: () => "127.0.0.1"
	} as unknown as Parameters<typeof GET>[0]);
}

beforeEach(() => {
	vi.spyOn(biomesProvider, "enabled", "get").mockReturnValue(true);
	vi.mocked(biomesProvider.getPools).mockReset();
	vi.mocked(rateLimitConsume).mockReset().mockResolvedValue([true, 100, 100, {}]);
});

describe("biome pool endpoint permissions", () => {
	it("denies missing permission without fetching or consuming quota", async () => {
		await expect(request({ everywhere: [], areas: [] })).rejects.toMatchObject({ status: 401 });
		expect(biomesProvider.getPools).not.toHaveBeenCalled();
		expect(rateLimitConsume).not.toHaveBeenCalled();
	});

	it("denies cells outside granted areas before any upstream request", async () => {
		await expect(
			request({
				everywhere: [],
				areas: [
					{
						name: "test",
						features: [MapObjectType.BIOME],
						polygon: {
							type: "Polygon",
							coordinates: [
								[
									[0, 0],
									[1, 0],
									[1, 1],
									[0, 1],
									[0, 0]
								]
							]
						}
					}
				]
			})
		).rejects.toMatchObject({ status: 401 });
		expect(biomesProvider.getPools).not.toHaveBeenCalled();
	});

	it("rejects malformed and non-level-16 IDs", async () => {
		for (const cell of ["bad", "4930867520941", "18446744073709551616"]) {
			await expect(
				request({ everywhere: [MapObjectType.BIOME], areas: [] }, cell)
			).rejects.toMatchObject({ status: 400 });
		}
		expect(biomesProvider.getPools).not.toHaveBeenCalled();
	});

	it("preserves rate-limit headers and does not fetch a refused request", async () => {
		vi.mocked(rateLimitConsume).mockResolvedValue([false, 0, 100, { "Retry-After": "30" }]);
		const result = await request({ everywhere: [MapObjectType.BIOME], areas: [] });
		expect(result.status).toBe(429);
		expect(result.headers.get("Retry-After")).toBe("30");
		expect(biomesProvider.getPools).not.toHaveBeenCalled();
	});

	it("grants the biome permission and its umbrella wildcards", async () => {
		const pools = {
			cell_id: id,
			components: [
				{ name: "background", share: 0.95, spawns: [] },
				{ name: "regional", share: 0.05, spawns: [] },
				{ name: null, share: 0.02, spawns: [{ pokemon_id: 774, form: 3380, weight: 1 }] }
			]
		};
		for (const permission of ["biome", "minor_map_object*", "map_object*", "*"]) {
			vi.mocked(biomesProvider.getPools).mockResolvedValue(pools);
			const result = await request({ everywhere: [permission] as Perms["everywhere"], areas: [] });
			expect(result.status).toBe(200);
			expect(await result.json()).toEqual(pools);
		}
		expect(biomesProvider.getPools).toHaveBeenCalledTimes(4);
	});

	it("returns 404 without fetching or consuming quota when biomes are disabled", async () => {
		vi.spyOn(biomesProvider, "enabled", "get").mockReturnValue(false);
		await expect(request({ everywhere: [MapObjectType.BIOME], areas: [] })).rejects.toMatchObject({
			status: 404
		});
		expect(biomesProvider.getPools).not.toHaveBeenCalled();
		expect(rateLimitConsume).not.toHaveBeenCalled();
	});
});
