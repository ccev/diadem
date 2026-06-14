import { getServerConfig } from "@/lib/services/config/config.server";
import { lookupGeometry } from "@/lib/services/geocoding.server";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { getLogger } from "@/lib/utils/logger";
import { error, json } from "@sveltejs/kit";

const log = getLogger("geometrylookup");

export async function GET({ params }) {
	if (!getServerConfig().nominatim?.url) error(500);

	const result = await lookupGeometry(params.id);

	if (!result) error(500);

	log.info("Succcessfully geometry for osm id " + params.id);

	return json(result, {
		headers: cacheHttpHeaders()
	});
}
