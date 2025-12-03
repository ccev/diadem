import { getServerConfig } from '@/lib/services/config/config.server';
import { getLogger } from '@/lib/server/logging';

const log = getLogger("koji")

export async function fetchKojiGeofences(thisFetch?: typeof fetch) {
	const config = getServerConfig();
	if (!config.koji) {
		log.warning("Koji was called, but is not configured")
		return {
			error: 'No Koji config',
			result: {}
		}
	}

	const url = config.koji.url + '/api/v1/geofence/FeatureCollection/' + config.koji.projectName;
	const response = await (thisFetch ?? fetch)(url, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${config.koji.secret}`,
			'Content-Type': 'application/json'
		}
	});

	const data = await response.json();
	return {
		error: data.data ? '' : data.message,
		result: data?.data?.features || {}
	};
}