import { json } from '@sveltejs/kit';
import { getServerConfig, readConfig } from '@/lib/config.server';

export async function GET() {
	const config = getServerConfig()
	if (!config.koji) return json({
		error: "No Koji config",
		result: {}
	})

	const url = config.koji.url + "/api/v1/geofence/FeatureCollection/" + config.koji.projectName
	const response = await fetch(
		url,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${config.koji.secret}`,
				"Content-Type": "application/json",
			}
		}
	)

	const data = await response.json()
	return json({
		error: data.data ? "" : data.message,
		result: data?.data?.features || {}
	})
}
