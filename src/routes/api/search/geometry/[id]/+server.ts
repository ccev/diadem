import { getServerConfig } from "@/lib/services/config/config.server";
import { respond } from "@/lib/server/api/respond";
import { lookupGeometry } from "@/lib/services/geocoding";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";

const log = getLogger("geometrylookup");

export async function GET({ params, request }) {
	if (!getServerConfig().nominatim?.url) error(500);

	const result = await lookupGeometry({ osmId: params.id });

	if (!result) error(500);

	log.info("Succcessfully geometry for osm id " + params.id);

	return respond(request, result, {
		headers: cacheHttpHeaders()
	});
}
