import { getClientConfig } from "@/lib/services/config/config.server";
import { respond } from "@/lib/server/api/respond";
import { searchAddress } from "@/lib/services/geocoding";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("addrsearch");

export async function GET({ params, url, request }) {
	// this accepts raw input and puts it into the url to the external service.
	// it's up to them to validate it.
	const lang = url.searchParams.get("lang") ?? getClientConfig().general.defaultLocale;
	const lat = url.searchParams.get("lat");
	const lon = url.searchParams.get("lon");

	const result = await searchAddress({ query: params.query, language: lang, lat, lon });

	log.info("Succcessfully serving address search results");

	return respond(request, result, {
		headers: cacheHttpHeaders()
	});
}
