import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features/activeSearch.svelte.js", () => ({ getActiveSearch: () => undefined }));
vi.mock("@/lib/map/featuresGen.svelte", () => ({ updateFeatures: vi.fn() }));
vi.mock("@/lib/map/map.svelte", () => ({ getMap: () => ({ getZoom: () => 15 }) }));
vi.mock("@/lib/mapObjects/dataLimitState.svelte", () => ({
	clearAllDataLimits: vi.fn(),
	clearDataLimit: vi.fn(),
	getDataLimit: () => undefined,
	setDataLimit: vi.fn()
}));
const state = vi.hoisted(() => ({ replace: vi.fn(), add: vi.fn() }));
vi.mock("@/lib/mapObjects/mapObjectsState.svelte.js", () => ({
	addMapObjects: state.add,
	clearAllMapObjects: vi.fn(),
	clearMapObjects: vi.fn(),
	getMapObjects: () => ({}),
	replaceMapObjects: state.replace
}));
vi.mock("@/lib/mapObjects/s2cells.js", () => ({ getS2CellMapObjects: () => [] }));
vi.mock("@/lib/mapObjects/weather.svelte", () => ({ updateWeather: vi.fn() }));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({
	getCurrentSelectedData: () => undefined
}));
vi.mock("@/lib/services/user/checkPerm", () => ({ hasAnyFeatureAnywhere: () => true }));
vi.mock("@/lib/services/user/userDetails.svelte", () => ({
	getUserDetails: () => ({ permissions: {} })
}));
vi.mock("@/lib/services/userSettings.svelte.js", () => ({
	getUserSettings: () => ({
		filters: {
			gym: { enabled: true, category: "gym" },
			pokestop: { enabled: true, category: "pokestop" },
			station: { enabled: false, category: "station" }
		}
	})
}));
vi.mock("@/lib/services/config/config", () => ({
	getConfig: () => ({ general: { msgpack: false } })
}));
vi.mock("@/lib/native/runtime", () => ({ isNative: () => false }));

import {
	applyMapObjectResponse,
	clearMap,
	fetchForts,
	planMapObjectRequest
} from "@/lib/mapObjects/updateMapObject";

const bounds = { minLat: 0, minLon: 0, maxLat: 1, maxLon: 1 };
const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
	fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
	state.replace.mockReset();
	state.add.mockReset();
	// drop the filter-hash bookkeeping so each case seeds its own
	clearMap();
});
afterEach(() => vi.unstubAllGlobals());

describe("planMapObjectRequest", () => {
	it("plans enabled types and skips disabled ones", () => {
		expect(planMapObjectRequest(MapObjectType.GYM)).toMatchObject({
			type: MapObjectType.GYM,
			isDelta: false,
			removeOld: true
		});
		expect(planMapObjectRequest(MapObjectType.STATION)).toBeUndefined();
	});
});

describe("fetchForts", () => {
	it("posts one request carrying each planned type and applies the per-type results", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({
				gym: { status: 200, filterCached: "1", result: { examined: 2, data: [{ id: "g" }] } },
				pokestop: { status: 200, result: { examined: 1, data: [] } }
			})
		);
		const plans = [
			planMapObjectRequest(MapObjectType.GYM)!,
			planMapObjectRequest(MapObjectType.POKESTOP)!
		];

		const results = await fetchForts(plans, bounds);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("/api/forts");
		const body = JSON.parse(init.body as string);
		expect(body).toMatchObject({ ...bounds });
		expect(Object.keys(body.types).sort()).toEqual(["gym", "pokestop"]);
		expect(body.types.gym.filter).toEqual({ enabled: true, category: "gym" });
		expect(typeof body.types.gym.filterHash).toBe("string");

		expect(results.get(MapObjectType.GYM)).toEqual({ examined: 2, data: [{ id: "g" }] });
		expect(results.get(MapObjectType.POKESTOP)).toEqual({ examined: 1, data: [] });

		for (const plan of plans) applyMapObjectResponse(plan, results.get(plan.type));
		expect(state.replace).toHaveBeenCalledWith([{ id: "g" }], MapObjectType.GYM, 2);
		expect(state.replace).toHaveBeenCalledWith([], MapObjectType.POKESTOP, 1);
	});

	it("omits a filter whose hash the server already knows, and re-sends it after a 409", async () => {
		fetchMock
			.mockResolvedValueOnce(
				jsonResponse({ gym: { status: 200, filterCached: "1", result: { examined: 0, data: [] } } })
			)
			.mockResolvedValueOnce(jsonResponse({ gym: { status: 409 } }))
			.mockResolvedValueOnce(jsonResponse({ examined: 5, data: [] }));

		const plan = planMapObjectRequest(MapObjectType.GYM)!;
		await fetchForts([plan], bounds);
		const second = await fetchForts([plan], bounds);

		const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
		expect(secondBody.types.gym.filter).toBeUndefined();
		expect(typeof secondBody.types.gym.filterHash).toBe("string");

		// 409 → retried alone through /api/gym with the filter attached
		expect(fetchMock.mock.calls[2][0]).toBe("/api/gym");
		const retryBody = JSON.parse(fetchMock.mock.calls[2][1].body as string);
		expect(retryBody.filter).toEqual({ enabled: true, category: "gym" });
		expect(second.get(MapObjectType.GYM)).toEqual({ examined: 5, data: [] });
	});

	it("yields undefined for a type the server refused, without throwing", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ gym: { status: 429 } }));
		const results = await fetchForts([planMapObjectRequest(MapObjectType.GYM)!], bounds);
		expect(results.get(MapObjectType.GYM)).toBeUndefined();
	});

	it("marks every type limit-reached data as empty with a data limit", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ gym: { status: 200, result: { examined: 9, data: [], limitReached: true } } })
		);
		const plan = planMapObjectRequest(MapObjectType.GYM)!;
		const results = await fetchForts([plan], bounds);
		applyMapObjectResponse(plan, results.get(MapObjectType.GYM));
		expect(state.replace).toHaveBeenCalledWith([], MapObjectType.GYM, 9);
	});
});
