import type { CpuWorkersConfig } from "@/lib/services/config/configTypes";
import { checkFeaturesInBounds } from "@/lib/services/user/checkPerm";
import { Features, type Perms } from "@/lib/utils/features";
import { bboxPolygon } from "@turf/turf";
import type { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({ config: {} as CpuWorkersConfig }));
const environment = vi.hoisted(() => ({ building: false, dev: true }));
vi.mock("$app/environment", () => environment);
vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({ cpuWorkers: settings.config })
}));

const bounds = { minLat: 0, minLon: 0, maxLat: 8, maxLon: 8 };
const features = [Features.GYM, Features.RAID];
const perms: Perms = {
	everywhere: [],
	areas: [
		{ name: "gyms", features: [Features.GYM], polygon: bboxPolygon([-1, -1, 3, 3]).geometry },
		{ name: "raids", features: [Features.RAID], polygon: bboxPolygon([5, 5, 6, 6]).geometry },
		{ name: "hidden", features: [Features.POKEMON], polygon: bboxPolygon([0, 0, 8, 8]).geometry }
	]
};
let geometry: (typeof import("./geometry") & typeof import("./cpu")) | undefined;
const decoder = new TextDecoder();
const encoder = new TextEncoder();
const lifecycle = process as EventEmitter;

async function load(config: CpuWorkersConfig = { threads: 1 }) {
	settings.config = config;
	return (geometry = { ...(await import("./cpu")), ...(await import("./geometry")) });
}

beforeEach(() => {
	vi.resetModules();
	environment.building = false;
});

afterEach(async () => {
	await geometry?.closeCpuWorkers();
	if (geometry) {
		expect(lifecycle.listeners("sveltekit:shutdown")).not.toContain(geometry.closeCpuWorkers);
	}
	geometry = undefined;
	vi.restoreAllMocks();
});

describe("server permission geometry", () => {
	it("keeps the disabled inline path without dispatching or registering shutdown work", async () => {
		const { checkFeaturesInBoundsServer, closeCpuWorkers } = await load({ threads: 0 });
		const { CpuWorkerPool } = await import("./pool");
		const run = vi.spyOn(CpuWorkerPool.prototype, "run");
		expect(await checkFeaturesInBoundsServer(perms, features, bounds)).toEqual(
			checkFeaturesInBounds(perms, features, bounds)
		);
		expect(run).not.toHaveBeenCalled();
		expect(lifecycle.listeners("sveltekit:shutdown")).not.toContain(closeCpuWorkers);
	});

	it("does not create a worker pool while SvelteKit is building", async () => {
		environment.building = true;
		const { checkFeaturesInBoundsServer, closeCpuWorkers } = await load();
		const { CpuWorkerPool } = await import("./pool");
		const run = vi.spyOn(CpuWorkerPool.prototype, "run");
		expect(await checkFeaturesInBoundsServer(perms, features, bounds)).toEqual(
			checkFeaturesInBounds(perms, features, bounds)
		);
		expect(run).not.toHaveBeenCalled();
		expect(lifecycle.listeners("sveltekit:shutdown")).not.toContain(closeCpuWorkers);
	});

	it("does not dispatch unrestricted grants, absent grants, or unrelated areas", async () => {
		const { checkFeaturesInBoundsServer } = await load();
		const { CpuWorkerPool } = await import("./pool");
		const run = vi.spyOn(CpuWorkerPool.prototype, "run");
		const everywhere: Perms = {
			everywhere: [Features.ALL],
			get areas(): Perms["areas"] {
				throw new Error("Must not inspect unrestricted geometry");
			}
		};
		expect(await checkFeaturesInBoundsServer(everywhere, features, bounds)).toEqual({
			bounds,
			polygon: null
		});
		expect(
			await checkFeaturesInBoundsServer({ everywhere: [], areas: [] }, features, bounds)
		).toBeNull();
		expect(await checkFeaturesInBoundsServer(perms, [Features.STATION], bounds)).toBeNull();
		expect(run).not.toHaveBeenCalled();
	});

	it("rejects distant permitted areas before encoding or queueing a worker job", async () => {
		const { checkFeaturesInBoundsServer } = await load();
		const { CpuWorkerPool } = await import("./pool");
		const run = vi.spyOn(CpuWorkerPool.prototype, "run");
		expect(
			await checkFeaturesInBoundsServer(perms, features, {
				minLat: 20,
				minLon: 20,
				maxLat: 21,
				maxLon: 21
			})
		).toBeNull();
		expect(run).not.toHaveBeenCalled();
	});

	it("matches the synchronous union and clipping and transfers only the selected job data", async () => {
		const { checkFeaturesInBoundsServer } = await load();
		const { CpuWorkerPool } = await import("./pool");
		const original = CpuWorkerPool.prototype.run;
		const jobs: unknown[] = [];
		vi.spyOn(CpuWorkerPool.prototype, "run").mockImplementation(function (
			this: InstanceType<typeof CpuWorkerPool>,
			encode,
			signal
		) {
			return original.call(
				this,
				() => {
					const input = encode();
					jobs.push(JSON.parse(decoder.decode(input)));
					return input;
				},
				signal
			);
		});
		const body = {
			...bounds,
			get filter() {
				throw new Error("Must not serialize the request body");
			},
			since: 1234
		};
		const before = structuredClone(perms);
		const expected = checkFeaturesInBounds(perms, features, bounds);
		const result = await checkFeaturesInBoundsServer(perms, features, body);
		expect(result).toEqual(expected);
		expect(result?.polygon?.geometry.type).toBe("MultiPolygon");
		expect(jobs).toEqual([
			{ type: "geometry", polygons: [perms.areas[0].polygon, perms.areas[1].polygon], bounds }
		]);
		expect(perms).toEqual(before);
		if (result) result.bounds.maxLat = 99;
		expect(await checkFeaturesInBoundsServer(perms, features, bounds)).toEqual(expected);
	});

	it("preserves holes and denial when only a hole or disjoint space is requested", async () => {
		const { checkFeaturesInBoundsServer } = await load();
		const polygon = bboxPolygon([0, 0, 8, 8]).geometry;
		polygon.coordinates.push(bboxPolygon([2, 2, 6, 6]).geometry.coordinates[0]);
		const holes: Perms = {
			everywhere: [],
			areas: [{ name: "hole", features, polygon }]
		};
		expect(await checkFeaturesInBoundsServer(holes, features, bounds)).toEqual(
			checkFeaturesInBounds(holes, features, bounds)
		);
		for (const viewport of [
			{ minLat: 3, minLon: 3, maxLat: 5, maxLon: 5 },
			{ minLat: 10, minLon: 10, maxLat: 11, maxLon: 11 }
		]) {
			expect(await checkFeaturesInBoundsServer(holes, features, viewport)).toBeNull();
		}
	});

	it("rejects a pre-aborted request even when its permissions are unrestricted", async () => {
		const { checkFeaturesInBoundsServer } = await load();
		await expect(
			checkFeaturesInBoundsServer(
				{ everywhere: [Features.ALL], areas: [] },
				features,
				bounds,
				AbortSignal.abort()
			)
		).rejects.toMatchObject({ code: "aborted" });
	});

	it("does not fall back inline after overload or a task byte-limit rejection", async () => {
		const { checkFeaturesInBoundsServer } = await load({ threads: 1, maxTaskBytes: 16 });
		await expect(checkFeaturesInBoundsServer(perms, features, bounds)).rejects.toMatchObject({
			code: "too-large"
		});
		const { CpuWorkerPool, CpuWorkerError } = await import("./pool");
		vi.spyOn(CpuWorkerPool.prototype, "run").mockRejectedValue(new CpuWorkerError("busy"));
		await expect(checkFeaturesInBoundsServer(perms, features, bounds)).rejects.toMatchObject({
			code: "busy"
		});
	});

	it("closes via the adapter shutdown listener and keeps restricted work unavailable afterward", async () => {
		const { initCpuWorkers, closeCpuWorkers, checkFeaturesInBoundsServer } = await load();
		initCpuWorkers();
		initCpuWorkers();
		const listeners = lifecycle.listeners("sveltekit:shutdown");
		expect(listeners.filter((listener) => listener === closeCpuWorkers)).toHaveLength(1);
		await listeners.find((listener) => listener === closeCpuWorkers)!();
		await expect(checkFeaturesInBoundsServer(perms, features, bounds)).rejects.toMatchObject({
			code: "unavailable"
		});
	});

	it.each([false, true])(
		"retires the previous development module on SSR reload (initialized: %s)",
		async (initialized) => {
			const previous = await load();
			if (initialized) await previous.checkFeaturesInBoundsServer(perms, features, bounds);
			vi.resetModules();
			const current = await load();
			try {
				await expect(
					previous.checkFeaturesInBoundsServer(perms, features, bounds)
				).rejects.toMatchObject({ code: "unavailable" });
				expect(lifecycle.listeners("sveltekit:shutdown")).not.toContain(previous.closeCpuWorkers);
				expect(await current.checkFeaturesInBoundsServer(perms, features, bounds)).toEqual(
					checkFeaturesInBounds(perms, features, bounds)
				);
			} finally {
				await previous.closeCpuWorkers();
			}
		}
	);

	it.each([
		{ bounds, polygon: null },
		{ bounds, polygon: { type: "Feature", geometry: { type: "Point", coordinates: [0, 0] } } },
		{ bounds: { ...bounds, maxLat: null }, polygon: bboxPolygon([0, 0, 1, 1]) },
		{},
		false
	])("rejects invalid or unrestricted output from a restricted worker job: %j", async (result) => {
		const { checkFeaturesInBoundsServer } = await load();
		const { CpuWorkerPool } = await import("./pool");
		vi.spyOn(CpuWorkerPool.prototype, "run").mockResolvedValue(
			encoder.encode(JSON.stringify(result)).buffer
		);
		await expect(checkFeaturesInBoundsServer(perms, features, bounds)).rejects.toMatchObject({
			code: "failed"
		});
	});

	it("reports invalid worker JSON as a controlled failure", async () => {
		const { checkFeaturesInBoundsServer } = await load();
		const { CpuWorkerPool } = await import("./pool");
		vi.spyOn(CpuWorkerPool.prototype, "run").mockResolvedValue(encoder.encode("not JSON").buffer);
		await expect(checkFeaturesInBoundsServer(perms, features, bounds)).rejects.toMatchObject({
			code: "failed"
		});
	});
});
