import { building, dev } from "$app/environment";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { getServerConfig } from "@/lib/services/config/config.server";
import {
	checkFeaturesInBounds,
	getPermissionPolygons,
	type PermittedBounds
} from "@/lib/services/user/checkPerm";
import type { FeaturesKey, Perms } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";
import { resolve } from "node:path";
import { CpuWorkerError, CpuWorkerPool } from "./pool";

let pool: CpuWorkerPool | undefined;
let stopped = false;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const runtime = globalThis as typeof globalThis & {
	__diademGeometryWorkers?: typeof closeGeometryWorkers;
};

// Vite's SSR loader does not provide import.meta.hot. Retire the previous module's pool.
if (dev && !building) {
	const previous = runtime.__diademGeometryWorkers;
	runtime.__diademGeometryWorkers = closeGeometryWorkers;
	void previous?.();
}

export function initGeometryWorkers() {
	if (building) return;
	if (stopped) throw new CpuWorkerError("unavailable");
	if (pool) return;
	const log = getLogger("geometry-workers");
	pool = new CpuWorkerPool(
		resolve(
			dev
				? "src/lib/server/workers/geometry.worker.mjs"
				: "build/server/workers/geometry.worker.mjs"
		),
		getServerConfig().geometryWorkers,
		(error) => log.error("Geometry pool stopped after a worker error: %s", error)
	);
	if (pool.enabled) {
		log.info(
			"Geometry workers enabled | threads: %d | queue: %d",
			pool.options.threads,
			pool.options.maxQueue
		);
		process.on("sveltekit:shutdown", closeGeometryWorkers);
	}
}

export function closeGeometryWorkers() {
	stopped = true;
	process.off("sveltekit:shutdown", closeGeometryWorkers);
	if (runtime.__diademGeometryWorkers === closeGeometryWorkers) {
		delete runtime.__diademGeometryWorkers;
	}
	return pool?.close();
}

export async function checkFeaturesInBoundsServer(
	perms: Perms,
	features: FeaturesKey[],
	bounds: Bounds,
	signal?: AbortSignal
): Promise<PermittedBounds | null> {
	if (signal?.aborted) throw new CpuWorkerError("aborted");
	initGeometryWorkers();
	if (!pool?.enabled) return checkFeaturesInBounds(perms, features, bounds);

	const polygons = getPermissionPolygons(perms, features);
	if (polygons === null) return { bounds, polygon: null };
	if (polygons.length === 0) return null;

	const result = await pool.run(
		() =>
			encoder.encode(
				JSON.stringify({
					polygons,
					// Callers may pass the full request body as Bounds. Never send it to a worker.
					bounds: {
						minLat: bounds.minLat,
						maxLat: bounds.maxLat,
						minLon: bounds.minLon,
						maxLon: bounds.maxLon
					}
				})
			).buffer,
		signal
	);
	try {
		const permitted = JSON.parse(decoder.decode(result)) as PermittedBounds | null;
		// A restricted geometry job can deny access, but must never grant unrestricted bounds.
		if (
			permitted !== null &&
			(permitted?.polygon?.type !== "Feature" ||
				!["Polygon", "MultiPolygon"].includes(permitted.polygon.geometry?.type) ||
				![
					permitted.bounds?.minLat,
					permitted.bounds?.maxLat,
					permitted.bounds?.minLon,
					permitted.bounds?.maxLon
				].every(Number.isFinite))
		) {
			throw new Error("Invalid geometry worker output");
		}
		return permitted;
	} catch (cause) {
		throw new CpuWorkerError("failed", { cause });
	}
}
