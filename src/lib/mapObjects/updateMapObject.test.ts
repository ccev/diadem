import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { DataLimitInfo } from "@/lib/mapObjects/dataLimitState.svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const scene = vi.hoisted(() => ({
	map: { getZoom: () => 15 } as { getZoom: () => number } | undefined,
	filters: {} as Record<string, { category: string; enabled: boolean }>,
	objects: {} as Record<string, unknown>,
	limits: new Map<MapObjectType, DataLimitInfo>(),
	selected: undefined as { type: MapObjectType } | undefined,
	search: undefined as
		{ mapObject: MapObjectType; filter: { category: string; enabled: boolean } } | undefined,
	events: [] as string[]
}));
vi.mock("@/lib/features/activeSearch.svelte.js", () => ({ getActiveSearch: () => scene.search }));
vi.mock("@/lib/map/featuresGen.svelte", () => ({
	updateFeatures: vi.fn(),
	needsFeatureUpdate: () => true
}));
vi.mock("@/lib/map/map.svelte", () => ({ getMap: () => scene.map }));
vi.mock("@/lib/mapObjects/mapBounds", () => ({
	getBounds: () => ({ minLat: 0, minLon: 0, maxLat: 1, maxLon: 1 })
}));
vi.mock("@/lib/mapObjects/dataLimitState.svelte", () => ({
	clearAllDataLimits: () => scene.limits.clear(),
	clearDataLimit: vi.fn((type: MapObjectType) => {
		scene.events.push(`clear:${type}`);
		scene.limits.delete(type);
	}),
	getDataLimit: (type: MapObjectType) => scene.limits.get(type),
	setDataLimit: vi.fn()
}));
const state = vi.hoisted(() => ({ replace: vi.fn(), add: vi.fn() }));
vi.mock("@/lib/mapObjects/mapObjectsState.svelte.js", () => ({
	addMapObjects: state.add,
	clearAllMapObjects: () => {
		scene.objects = {};
	},
	clearMapObjects: (type: MapObjectType) => {
		scene.objects = Object.fromEntries(
			Object.entries(scene.objects).filter(([key]) => !key.startsWith(type + "-"))
		);
	},
	getMapObjects: () => scene.objects,
	replaceMapObjects: state.replace
}));
vi.mock("@/lib/mapObjects/s2cells.js", () => ({ getS2CellMapObjects: () => [] }));
vi.mock("@/lib/mapObjects/weather.svelte", () => ({ updateWeather: vi.fn() }));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({
	getCurrentSelectedData: () => scene.selected
}));
vi.mock("@/lib/services/user/checkPerm", () => ({ hasAnyFeatureAnywhere: () => true }));
vi.mock("@/lib/services/user/userDetails.svelte", () => ({
	getUserDetails: () => ({ permissions: {} })
}));
vi.mock("@/lib/services/userSettings.svelte.js", () => ({
	getUserSettings: () => ({ filters: scene.filters })
}));
vi.mock("@/lib/services/config/config", () => ({
	getConfig: () => ({ general: { msgpack: false } })
}));
vi.mock("@/lib/native/runtime", () => ({ isNative: () => false }));

import {
	applyMapObjectResponse,
	cancelMapObjectRequests,
	clearMap,
	fetchForts,
	getLastQueryTimestamps,
	planMapObjectRequest,
	updateAllMapObjects
} from "@/lib/mapObjects/updateMapObject";
import { updateFeatures } from "@/lib/map/featuresGen.svelte";
import { updateWeather } from "@/lib/mapObjects/weather.svelte";

const bounds = { minLat: 0, minLon: 0, maxLat: 1, maxLon: 1 };
const jsonResponse = (body: unknown) =>
	new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
	scene.map = { getZoom: () => 15 };
	scene.search = undefined;
	scene.selected = undefined;
	scene.filters = {
		gym: { enabled: true, category: "gym" },
		pokestop: { enabled: true, category: "pokestop" },
		station: { enabled: false, category: "station" }
	};
	fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
	state.replace.mockReset();
	state.add.mockReset();
	state.replace.mockImplementation((data, type) => {
		scene.events.push(`apply:${type}`);
		scene.objects = {
			...Object.fromEntries(
				Object.entries(scene.objects).filter(([key]) => !key.startsWith(type + "-"))
			),
			...Object.fromEntries(
				data.map((item: { id: string; mapId?: string }) => [
					item.mapId ?? `${type}-${item.id}`,
					item
				])
			)
		};
	});
	vi.mocked(updateFeatures)
		.mockReset()
		.mockImplementation(() => {
			scene.events.push("publish");
		});
	vi.mocked(updateWeather).mockReset().mockResolvedValue(undefined);
	// drop the filter-hash bookkeeping so each case seeds its own
	clearMap();
	scene.events = [];
	vi.mocked(updateFeatures).mockClear();
});
afterEach(() => {
	cancelMapObjectRequests();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("planMapObjectRequest", () => {
	it("plans enabled types and skips disabled ones", () => {
		expect(planMapObjectRequest(MapObjectType.GYM)).toMatchObject({
			type: MapObjectType.GYM,
			isDelta: false,
			removeOld: true
		});
		expect(planMapObjectRequest(MapObjectType.STATION)).toBeUndefined();
	});

	it("does not advance a delta timestamp until its response is applied", () => {
		vi.spyOn(Date, "now").mockReturnValue(100_000);
		getLastQueryTimestamps().set(MapObjectType.GYM, 50);
		const plan = planMapObjectRequest(MapObjectType.GYM, true, undefined, true)!;
		expect(plan).toMatchObject({ since: 50, queryTimestamp: 100, isDelta: true });
		expect(getLastQueryTimestamps().get(MapObjectType.GYM)).toBe(50);

		vi.mocked(Date.now).mockReturnValue(150_000);
		applyMapObjectResponse(plan, { examined: 0, data: [] });
		expect(getLastQueryTimestamps().get(MapObjectType.GYM)).toBe(99);
	});

	it.each(["failed", "aborted", "limited", "apply-failed"])(
		"does not advance timestamps for %s responses",
		(outcome) => {
			vi.spyOn(console, "error").mockImplementation(() => {});
			vi.spyOn(console, "log").mockImplementation(() => {});
			vi.spyOn(Date, "now").mockReturnValue(100_000);
			getLastQueryTimestamps().set(MapObjectType.GYM, 50);
			const plan = planMapObjectRequest(MapObjectType.GYM, true, undefined, true)!;
			const controller = new AbortController();
			if (outcome === "aborted") controller.abort();
			if (outcome === "apply-failed")
				state.add.mockImplementationOnce(() => {
					throw new Error("apply failed");
				});
			applyMapObjectResponse(
				plan,
				outcome === "failed"
					? undefined
					: { examined: 0, data: [], limitReached: outcome === "limited" },
				controller.signal
			);
			expect(getLastQueryTimestamps().get(MapObjectType.GYM)).toBe(50);
		}
	);

	it("retries a failed full refresh as a full snapshot instead of reusing the old viewport's timestamp", () => {
		getLastQueryTimestamps().set(MapObjectType.GYM, 50);
		const full = planMapObjectRequest(MapObjectType.GYM)!;
		expect(getLastQueryTimestamps().has(MapObjectType.GYM)).toBe(false);
		applyMapObjectResponse(full, undefined);
		expect(planMapObjectRequest(MapObjectType.GYM, true, undefined, true)).toMatchObject({
			since: undefined,
			isDelta: false
		});
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
		expect(body).toMatchObject(bounds);
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

	it("commits timestamps independently for successful, failed and limited fort slices", async () => {
		vi.spyOn(Date, "now").mockReturnValue(100_000);
		scene.filters.station = { category: "station", enabled: true };
		const types = [MapObjectType.GYM, MapObjectType.POKESTOP, MapObjectType.STATION];
		for (const type of types) getLastQueryTimestamps().set(type, 50);
		const plans = types.map((type) => planMapObjectRequest(type, true, undefined, true)!);
		fetchMock.mockResolvedValue(
			jsonResponse({
				gym: { status: 200, result: { examined: 0, data: [] } },
				pokestop: { status: 429 },
				station: { status: 200, result: { examined: 10, data: [], limitReached: true } }
			})
		);
		const responses = await fetchForts(plans, bounds);
		for (const plan of plans) applyMapObjectResponse(plan, responses.get(plan.type));
		expect(types.map((type) => getLastQueryTimestamps().get(type))).toEqual([99, 50, 50]);
	});
});

describe("progressive map-object publication", () => {
	it("does not start work without an active map", async () => {
		scene.map = undefined;
		await updateAllMapObjects();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(updateFeatures).not.toHaveBeenCalled();
		expect(updateWeather).not.toHaveBeenCalled();
	});

	it("coalesces individual responses that complete together", async () => {
		scene.filters = {
			gym: { category: "gym", enabled: true },
			pokemon: { category: "pokemon", enabled: true }
		};
		const release = Promise.withResolvers<void>();
		fetchMock.mockImplementation(async () => {
			await release.promise;
			return jsonResponse({ examined: 0, data: [] });
		});
		const batch = updateAllMapObjects();
		await vi.waitFor(() => expect(updateFeatures).toHaveBeenCalledOnce());
		vi.mocked(updateFeatures).mockClear();
		release.resolve();
		await batch;
		expect(updateFeatures).toHaveBeenCalledTimes(2);
	});

	it("publishes a ready family before slower objects or weather, without completing the batch early", async () => {
		scene.filters = {
			gym: { category: "gym", enabled: true },
			pokemon: { category: "pokemon", enabled: true }
		};
		const gym = Promise.withResolvers<Response>();
		const pokemon = Promise.withResolvers<Response>();
		const weather = Promise.withResolvers<void>();
		fetchMock.mockImplementation((url) => (url === "/api/gym" ? gym.promise : pokemon.promise));
		vi.mocked(updateWeather).mockReturnValue(weather.promise);
		const finished = vi.fn();
		const batch = updateAllMapObjects().then(finished);

		gym.resolve(jsonResponse({ examined: 1, data: [{ id: "g" }] }));
		await vi.waitFor(() => expect(scene.objects["gym-g"]).toEqual({ id: "g" }));
		expect(vi.mocked(updateFeatures).mock.calls.at(-1)?.[1]).toContain(MapObjectType.GYM);
		expect(vi.mocked(updateFeatures).mock.calls.at(-1)?.[1]).not.toContain(MapObjectType.POKEMON);
		expect(finished).not.toHaveBeenCalled();
		await updateAllMapObjects(true, true);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		pokemon.resolve(jsonResponse({ examined: 1, data: [{ id: "p" }] }));
		await vi.waitFor(() => expect(scene.objects["pokemon-p"]).toEqual({ id: "p" }));
		expect(vi.mocked(updateFeatures).mock.calls.at(-1)?.[1]).toContain(MapObjectType.POKEMON);
		expect(finished).not.toHaveBeenCalled();
		weather.resolve();
		await batch;
		expect(finished).toHaveBeenCalledOnce();
	});

	it("publishes combined slices together before the final reconciliation", async () => {
		const response = Promise.withResolvers<Response>();
		fetchMock.mockReturnValue(response.promise);
		const batch = updateAllMapObjects();
		await vi.waitFor(() => expect(updateFeatures).toHaveBeenCalledOnce());
		vi.mocked(updateFeatures).mockClear();
		response.resolve(
			jsonResponse({
				gym: { status: 200, result: { examined: 1, data: [{ id: "g" }] } },
				pokestop: { status: 200, result: { examined: 1, data: [{ id: "p" }] } }
			})
		);
		await batch;
		expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/forts", expect.anything());
		expect(updateFeatures).toHaveBeenCalledTimes(2);
		expect(vi.mocked(updateFeatures).mock.calls[0][0]).toEqual({
			"gym-g": { id: "g" },
			"pokestop-p": { id: "p" }
		});
	});

	it("clears a recovered data limit only after publishing the corresponding response", async () => {
		scene.filters = { gym: { category: "gym", enabled: true } };
		scene.limits.set(MapObjectType.GYM, { zoom: 14, filterJson: "old" });
		fetchMock.mockImplementation(async () => jsonResponse({ examined: 1, data: [{ id: "g" }] }));
		await updateAllMapObjects();
		const applied = scene.events.indexOf("apply:gym");
		const cleared = scene.events.indexOf("clear:gym");
		expect(cleared).toBeGreaterThan(applied);
		expect(scene.events.slice(applied + 1, cleared)).toContain("publish");
		expect(scene.limits.has(MapObjectType.GYM)).toBe(false);
	});

	it("does not let an aborted batch apply old data or release the new batch's busy guard", async () => {
		vi.spyOn(Date, "now").mockReturnValue(100_000);
		scene.filters = { gym: { category: "gym", enabled: true } };
		const old = Promise.withResolvers<Response>();
		const next = Promise.withResolvers<Response>();
		fetchMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
		const oldBatch = updateAllMapObjects();
		vi.mocked(Date.now).mockReturnValue(200_000);
		const nextBatch = updateAllMapObjects();
		expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
		old.resolve(jsonResponse({ examined: 1, data: [{ id: "old" }] }));
		await oldBatch;
		expect(getLastQueryTimestamps().has(MapObjectType.GYM)).toBe(false);
		await updateAllMapObjects(true, true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(scene.objects["gym-old"]).toBeUndefined();
		next.resolve(jsonResponse({ examined: 1, data: [{ id: "new" }] }));
		await nextBatch;
		expect(scene.objects["gym-new"]).toEqual({ id: "new" });
		expect(getLastQueryTimestamps().get(MapObjectType.GYM)).toBe(199);
	});

	it("cancels pending data when clearing or leaving the map", async () => {
		scene.filters = { gym: { category: "gym", enabled: true } };
		const response = Promise.withResolvers<Response>();
		fetchMock.mockReturnValue(response.promise);
		const batch = updateAllMapObjects();
		clearMap();
		expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
		response.resolve(jsonResponse({ examined: 1, data: [{ id: "stale" }] }));
		await batch;
		expect(scene.objects).toEqual({});
		expect(state.replace).not.toHaveBeenCalled();
	});

	it("handles weather rejection without blocking object publication or the next update", async () => {
		scene.filters = { gym: { category: "gym", enabled: true } };
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(updateWeather).mockRejectedValueOnce(new Error("weather unavailable"));
		fetchMock.mockImplementation(async () => jsonResponse({ examined: 1, data: [{ id: "g" }] }));
		await updateAllMapObjects();
		await updateAllMapObjects(true, true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(updateFeatures).toHaveBeenCalled();
	});

	it("aborts pending work and releases the busy guard when publication fails", async () => {
		scene.filters = { gym: { category: "gym", enabled: true } };
		const response = Promise.withResolvers<Response>();
		fetchMock.mockReturnValueOnce(response.promise);
		vi.mocked(updateFeatures).mockImplementationOnce(() => {
			throw new Error("render failed");
		});
		await expect(updateAllMapObjects()).rejects.toThrow("render failed");
		expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
		response.resolve(jsonResponse({ examined: 1, data: [{ id: "old" }] }));
		fetchMock.mockImplementation(async () => jsonResponse({ examined: 0, data: [] }));
		await updateAllMapObjects(true, true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(scene.objects["gym-old"]).toBeUndefined();
	});

	it("publishes clear-only and local S2 batches without network requests", async () => {
		scene.filters = {};
		scene.objects = { "gym-old": { id: "old" } };
		await updateAllMapObjects();
		expect(scene.objects).toEqual({});
		expect(updateFeatures).toHaveBeenCalledTimes(2);
		scene.filters.s2cell = { category: "s2cell", enabled: true };
		await updateAllMapObjects();
		expect(state.replace).toHaveBeenCalledWith([], MapObjectType.S2_CELL, 0);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("keeps a fort search's route companion and does not start weather", async () => {
		scene.search = { mapObject: MapObjectType.GYM, filter: { category: "gym", enabled: true } };
		scene.filters.route = { category: "route", enabled: true };
		fetchMock.mockImplementation(async () => jsonResponse({ examined: 0, data: [] }));
		await updateAllMapObjects();
		expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual(["/api/gym", "/api/route"]);
		expect(updateWeather).not.toHaveBeenCalled();
	});

	it("does not regenerate preserved popup routes early and reconciles removals after weather", async () => {
		scene.filters = {
			gym: { category: "gym", enabled: true },
			route: { category: "route", enabled: false }
		};
		scene.selected = { type: MapObjectType.GYM };
		scene.objects = { "route-r": { id: "r" } };
		const weather = Promise.withResolvers<void>();
		vi.mocked(updateWeather).mockReturnValue(weather.promise);
		fetchMock.mockImplementation(async () => jsonResponse({ examined: 1, data: [{ id: "g" }] }));
		const batch = updateAllMapObjects();
		await vi.waitFor(() => expect(scene.objects["gym-g"]).toEqual({ id: "g" }));
		for (const [, types] of vi.mocked(updateFeatures).mock.calls) {
			expect(types).not.toContain(MapObjectType.ROUTE);
		}
		expect(scene.objects["route-r"]).toEqual({ id: "r" });

		// A popup can close and release its companion routes while weather is still pending.
		scene.objects = { "gym-g": { id: "g" } };
		weather.resolve();
		await batch;
		expect(vi.mocked(updateFeatures).mock.calls.at(-1)?.[0]).toEqual(scene.objects);
		expect(vi.mocked(updateFeatures).mock.calls.at(-1)?.[1]).toContain(MapObjectType.ROUTE);
	});
});
