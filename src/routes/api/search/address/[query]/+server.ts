import { getClientConfig } from "@/lib/services/config/config.server";
import { searchAddress } from "@/lib/services/geocoding.server";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { getLogger } from "@/lib/utils/logger";
import { json } from "@sveltejs/kit";

const log = getLogger("addrsearch");

export async function GET({ params, url }) {
	// this accepts raw input and puts it into the url to the external service.
	// it's up to them to validate it.
	const lang = url.searchParams.get("lang") ?? getClientConfig().general.defaultLocale;
	const lat = url.searchParams.get("lat");
	const lon = url.searchParams.get("lon");

	const result = await searchAddress(params.query, lang, lat, lon);

	log.info("Succcessfully serving address search results");

	return json(result, {
		headers: cacheHttpHeaders()
	});
}
