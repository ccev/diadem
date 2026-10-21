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

	const result = await pool.run(
		() =>
			encoder.encode(
				JSON.stringify({
					type: "geometry",
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
