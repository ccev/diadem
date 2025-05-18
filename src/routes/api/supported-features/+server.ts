import { json } from '@sveltejs/kit';
import { getServerConfig, isAuthRequired } from '@/lib/config/config.server';
import type { SupportedFeatures } from '@/lib/enabledFeatures';

export async function GET() {
	const config = getServerConfig();

	return json({
		koji: !!config.koji && !!config.koji.url,
		geocoding: !!config.nominatim && !!config.nominatim.url,
		auth: !!config.auth?.enabled,
		authRequired: isAuthRequired()
	});
}
