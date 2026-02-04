import { error, json } from "@sveltejs/kit";
import { getClientConfig, getServerConfig } from "@/lib/services/config/config.server";
import type { FeatureCollection, Point } from "geojson";
import { getServerLogger } from "@/lib/server/logging";
import { getLogger } from "@/lib/utils/logger";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { searchAddress } from "@/lib/services/geocoding.server";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { query } from "@/lib/server/db/external/internalQuery";
import type { RawFortSearchEntry } from "@/lib/services/search.svelte";

const log = getLogger("fortsearch");

export async function POST({ params, url, request }) {
	const bounds = await request.json() as Bounds

	const whereBounds = "WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?"
	const boundsValues = [bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]

	const pokestopQuery = "(SELECT 'p' AS type, name, id, url FROM pokestop " + whereBounds + " AND deleted = 0)"
	const gymQuery = "(SELECT 'g' AS type, name, id, url FROM gym " + whereBounds + " AND deleted = 0)"
	// const stationQuery = "(SELECT 's' AS type, name, id, '' AS url FROM station " + whereBounds + ")"
	// no stattion cuz who cares, and it's soo much data

	const result = await query<RawFortSearchEntry[]>(
		[pokestopQuery, gymQuery].join(" UNION ALL ") + " ORDER BY name ASC",
		Array(2).fill(boundsValues).flat()
	)

	if (result.error) {
		log.error("Error while querying fort search: " + result.error)
		error(500)
	}

	log.info("Succcessfully serving %d fort results", result.result.length);

	return json(
		result.result
	);
}
