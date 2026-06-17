import { buildSpatialFilter } from "@/lib/server/api/spatialFilter";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { query } from "@/lib/server/db/external/internalQuery";
import { checkFeatureInBounds } from "@/lib/services/user/checkPerm";
import { Features } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";
import { error, json } from "@sveltejs/kit";
import { geojson, s2 } from "s2js";
import type { Polygon } from "geojson";
import type { FortData } from "@/lib/features/wayfarerMap.svelte";

const log = getLogger("wayfarerforts");
const MAX_CELLS_FORTS = 400;
const MAX_CELLS_COUNTS_ONLY = 7000;

export type WayfarerFortsRequest = {
	cellIds: string[];
	countsOnly?: boolean;
};

export type WayfarerFortsResponse = {
	pokestopCounts: Record<string, number>;
	gymCounts: Record<string, number>;
	forts: FortData[];
};

export async function POST({ request, locals }) {
	if (!hasFeatureAnywhereServer(locals.perms, Features.WAYFARER_MAP, locals.user)) error(401);

	let body: WayfarerFortsRequest;
	try {
		body = (await request.json()) as WayfarerFortsRequest;
	} catch {
		error(400, "Invalid JSON");
	}

	if (!body || !Array.isArray(body.cellIds)) {
		error(400, "cellIds must be an array");
	}

	const countsOnly = !!body.countsOnly;
	const maxCells = countsOnly ? MAX_CELLS_COUNTS_ONLY : MAX_CELLS_FORTS;
	const rawCellIds = body.cellIds.slice(0, maxCells);

	if (rawCellIds.length === 0) {
		return json({ pokestopCounts: {}, gymCounts: {}, forts: [] } satisfies WayfarerFortsResponse);
	}

	let minLat = 90;
	let maxLat = -90;
	let minLon = 180;
	let maxLon = -180;

	const cellIds: string[] = [];
	for (const cellIdStr of rawCellIds) {
		if (typeof cellIdStr !== "string" || !/^\d+$/.test(cellIdStr)) {
			error(400, "cellIds must be numeric strings");
		}
		const cell = s2.Cell.fromCellID(BigInt(cellIdStr));
		cellIds.push(cellIdStr);
		const polygon = geojson.toGeoJSON(cell) as Polygon;
		for (const ring of polygon.coordinates) {
			for (const [lon, lat] of ring) {
				if (lat < minLat) minLat = lat;
				if (lat > maxLat) maxLat = lat;
				if (lon < minLon) minLon = lon;
				if (lon > maxLon) maxLon = lon;
			}
		}
	}

	const bounds = { minLat, maxLat, minLon, maxLon };

	// Governed solely by the `wayfarer_map` feature; pokestop/gym grants don't affect it.
	const permitted = checkFeatureInBounds(locals.perms, Features.WAYFARER_MAP, bounds);

	const queries: string[] = [];
	const values: unknown[] = [];

	if (permitted) {
		const pokestopSpatial = buildSpatialFilter(permitted.polygon ?? null, permitted.bounds);
		queries.push(
			"(SELECT 'p' AS type, id, lat, lon, name, url, description, partner_id, sponsor_id, updated, first_seen_timestamp FROM pokestop WHERE " +
				pokestopSpatial.sql +
				" AND deleted = 0)"
		);
		values.push(...pokestopSpatial.values);

		const gymSpatial = buildSpatialFilter(permitted.polygon ?? null, permitted.bounds);
		queries.push(
			"(SELECT 'g' AS type, id, lat, lon, name, url, description, partner_id, sponsor_id, updated, first_seen_timestamp FROM gym WHERE " +
				gymSpatial.sql +
				" AND deleted = 0)"
		);
		values.push(...gymSpatial.values);
	}

	if (queries.length === 0) error(401);

	try {
		const result = await query<FortData[]>(queries.join(" UNION ALL "), values);

		const requestedCellIds = new Set(cellIds);
		const pokestopCounts: Record<string, number> = {};
		const gymCounts: Record<string, number> = {};
		const forts: FortData[] = [];

		for (const fort of result) {
			const leafCellId = s2.cellid.fromLatLng(s2.LatLng.fromDegrees(fort.lat, fort.lon));
			const l14CellId = s2.cellid.parent(leafCellId, 14).toString();
			if (!requestedCellIds.has(l14CellId)) continue;

			if (fort.type === "g") {
				gymCounts[l14CellId] = (gymCounts[l14CellId] ?? 0) + 1;
			} else {
				pokestopCounts[l14CellId] = (pokestopCounts[l14CellId] ?? 0) + 1;
			}
			if (!countsOnly) forts.push(fort);
		}

		log.info(
			"Serving wayfarer data: %d cells, %d forts (countsOnly=%s)",
			Object.keys(pokestopCounts).length + Object.keys(gymCounts).length,
			forts.length,
			countsOnly
		);

		return json({ pokestopCounts, gymCounts, forts } satisfies WayfarerFortsResponse);
	} catch (e) {
		log.error("Error while querying wayfarer forts", e);
		error(500);
	}
}
