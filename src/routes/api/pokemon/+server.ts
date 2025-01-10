import { json } from '@sveltejs/kit';
import {env} from '$env/dynamic/private'
import { getServerConfig } from '@/lib/config.server';

export async function POST({ request }) {
	const reqBody = await request.json()
	const body = {
		min: {
			latitude: reqBody.minLat,
			longitude: reqBody.minLon,
		},
		max: {
			latitude: reqBody.maxLat,
			longitude: reqBody.maxLon,
		},
		limit: 500000,
		filters: [
			{
				pokemon: [

				]
			}
		]
	}

	let url = getServerConfig().golbat.url || env.GOLBAT_BACKEND_URL
	url += "/api/pokemon/v2/scan"

	const response = await fetch(
		url,
		{
			method: "POST",
			headers: {
				"Authorization": getServerConfig().golbat.auth || env.GOLBAT_BACKEND_AUTH,
			},
			body: JSON.stringify(body)
		}
	)
	const results = await response.json()
	return json({result: results, error: undefined});
}
