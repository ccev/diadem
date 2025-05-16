import { json } from '@sveltejs/kit';
import { getServerConfig, isConfigInitialized, readConfig } from '@/lib/config.server';
import type { FeatureCollection, Point } from 'geojson';
import type { SupportedFeatures } from '@/lib/enabledFeatures';

export async function GET(): Promise<SupportedFeatures> {
	if (!isConfigInitialized()) {
		await readConfig()
	}

	const config = getServerConfig()

	return json({
		koji: !!config.koji && !!config.koji.url,
		geocoding: !!config.nominatim && !!config.nominatim.url
	})
}
