import { json } from '@sveltejs/kit';
import { getServerConfig, isAuthRequired } from '@/lib/services/config/config.server';

export async function GET({ locals }) {
	const config = getServerConfig();

	return json({
		koji: !!config.koji && !!config.koji.url,
		geocoding: !!config.nominatim && !!config.nominatim.url,
		auth: !!config.auth?.enabled,
		authRequired: isAuthRequired(),
		showFullscreenLogin: isAuthRequired() && !locals.user
	});
}
