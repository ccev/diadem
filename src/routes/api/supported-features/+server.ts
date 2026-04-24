import { json } from "@sveltejs/kit";
import { getServerConfig } from "@/lib/services/config/config.server";
import { isAuthFeatureEnabled, isAuthRequiredEnabled } from "@/lib/server/auth/betterAuth";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	const config = getServerConfig();
	const authEnabled = isAuthFeatureEnabled();
	const authRequired = isAuthRequiredEnabled();

	return json({
		koji: !!config.koji && !!config.koji.url,
		geocoding:
			(!!config.nominatim && !!config.nominatim.url) ||
			(!!config.pelias && !!config.pelias.url) ||
			(!!config.photon && !!config.photon.url),
		auth: authEnabled,
		authRequired,
		showFullscreenLogin: authRequired && !locals.user
	});
};
