import { error, json } from "@sveltejs/kit";
import { getClientConfig, getServerConfig } from "@/lib/services/config/config.server";
import type { FeatureCollection, Point } from "geojson";
import { getServerLogger } from "@/lib/server/logging";
import { getLogger } from "@/lib/utils/logger";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { searchAddress } from "@/lib/services/geocoding.server";

const log = getLogger("nominatim");

export async function GET({ params, url }) {
	// this accepts raw input and puts it into the url to the external service.
	// it's up to them to validate it.
	const lang = url.searchParams.get("lang") ?? getClientConfig().general.defaultLocale;
	const lat = url.searchParams.get("lat")
	const lon = url.searchParams.get("lon")

	const result = await searchAddress(
		params.query,
		lang,
		lat,
		lon
	)

	log.info("Succcessfully serving address search results");

	return json(
		result,
		{
			headers: cacheHttpHeaders()
		}
	);
}
