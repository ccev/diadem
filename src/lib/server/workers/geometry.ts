import type { Bounds } from "@/lib/mapObjects/mapBounds";
import {
	checkFeaturesInBounds,
	getPermissionPolygons,
	type PermittedBounds
} from "@/lib/services/user/checkPerm";
import type { FeaturesKey, Perms } from "@/lib/utils/features";
import { getCpuWorkerPool } from "./cpu";
import { CpuWorkerError } from "./pool";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function checkFeaturesInBoundsServer(
	perms: Perms,
	features: FeaturesKey[],
	bounds: Bounds,
	signal?: AbortSignal
): Promise<PermittedBounds | null> {
	if (signal?.aborted) throw new CpuWorkerError("aborted");
	const pool = getCpuWorkerPool();
	if (!pool) return checkFeaturesInBounds(perms, features, bounds);

	const polygons = getPermissionPolygons(perms, features, bounds);
	if (polygons === null) return { bounds, polygon: null };
	if (polygons.length === 0) return null;

	// Callers may pass the full request body as Bounds. Send only coordinates to the worker.
	const { minLat, maxLat, minLon, maxLon } = bounds;
	const result = await pool.run(
		() =>
			encoder.encode(
				JSON.stringify({
					type: "geometry",
					polygons,
					bounds: { minLat, maxLat, minLon, maxLon }
				})
			).buffer,
		signal
	);
	try {
		const permitted = JSON.parse(decoder.decode(result)) as PermittedBounds | null;
		if (permitted === null) return null;
		const { polygon, bounds: clipped } = permitted;
		// A restricted geometry job can deny access, but must never grant unrestricted bounds.
		if (
			polygon?.type !== "Feature" ||
			!["Polygon", "MultiPolygon"].includes(polygon.geometry?.type) ||
			![clipped?.minLat, clipped?.maxLat, clipped?.minLon, clipped?.maxLon].every(Number.isFinite)
		) {
			throw new Error("Invalid geometry worker output");
		}
		return permitted;
	} catch (cause) {
		throw new CpuWorkerError("failed", { cause });
	}
}
