import { getServerConfig, isAuthRequired } from "@/lib/services/config/config.server";
import type { SupportedFeatures } from "@/lib/services/supportedFeatures";
import { json } from "@sveltejs/kit";

export async function GET({ locals }) {
	const config = getServerConfig();

	return json({
		koji: !!config.koji && !!config.koji.url,
		geocoding:
			(!!config.nominatim && !!config.nominatim.url) ||
			(!!config.pelias && !!config.pelias.url) ||
			(!!config.photon && !!config.photon.url),
		auth: !!config.auth?.enabled,
		authRequired: isAuthRequired(),
		showFullscreenLogin: isAuthRequired() && !locals.user,
		geometryLookup:
			Boolean(config.nominatim?.url) &&
			(!Boolean(config.pelias?.url) || Boolean(config.photon?.url)), // supported if nomatim is set and pelias is not the provider
		overpass: !!config.overpass && !!config.overpass.url
	} as SupportedFeatures);
}
