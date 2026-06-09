import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { buildSpatialFilter } from "@/lib/server/api/spatialFilter";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { query } from "@/lib/server/db/external/internalQuery";
import { checkFeatureInBounds } from "@/lib/services/user/checkPerm";
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
	const hasPokestops = hasFeatureAnywhereServer(locals.perms, MapObjectType.POKESTOP, locals.user);
	const hasGyms = hasFeatureAnywhereServer(locals.perms, MapObjectType.GYM, locals.user);
	if (!hasPokestops && !hasGyms) error(401);

	const body = (await request.json()) as WayfarerFortsRequest;
	const countsOnly = !!body.countsOnly;
	const maxCells = countsOnly ? MAX_CELLS_COUNTS_ONLY : MAX_CELLS_FORTS;
	const cellIds = body.cellIds.slice(0, maxCells);

	if (cellIds.length === 0) {
		return json({ pokestopCounts: {}, gymCounts: {}, forts: [] } satisfies WayfarerFortsResponse);
	}

	let minLat = 90;
	let maxLat = -90;
	let minLon = 180;
	let maxLon = -180;

	for (const cellIdStr of cellIds) {
		const cellId = BigInt(cellIdStr);
		const cell = s2.Cell.fromCellID(cellId);
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

	const pokestopPermitted = checkFeatureInBounds(locals.perms, MapObjectType.POKESTOP, bounds);
	const gymPermitted = checkFeatureInBounds(locals.perms, MapObjectType.GYM, bounds);

	const queries: string[] = [];
	let values: any[] = [];

	if (hasPokestops && pokestopPermitted) {
		const spatial = buildSpatialFilter(pokestopPermitted.polygon ?? null, pokestopPermitted.bounds);
		queries.push(
			"(SELECT 'p' AS type, id, lat, lon, name, url, description, partner_id, sponsor_id, updated, first_seen_timestamp FROM pokestop WHERE " +
				spatial.sql +
				" AND deleted = 0)"
		);
		values = values.concat(spatial.values);
	}

	if (hasGyms && gymPermitted) {
		const spatial = buildSpatialFilter(gymPermitted.polygon ?? null, gymPermitted.bounds);
		queries.push(
			"(SELECT 'g' AS type, id, lat, lon, name, url, description, partner_id, sponsor_id, updated, first_seen_timestamp FROM gym WHERE " +
				spatial.sql +
				" AND deleted = 0)"
		);
		values = values.concat(spatial.values);
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
