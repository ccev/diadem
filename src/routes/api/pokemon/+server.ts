import { json } from '@sveltejs/kit';
import {env} from '$env/dynamic/private'
import { getServerConfig } from '@/lib/config/config.server';
import type { AllFilters } from '@/lib/filters/filters';
import { checkPermsFeatures, noPermResult } from '@/lib/user/checkPerm';

export async function POST({ request, locals }) {
	console.log(locals.perms)
	if (!checkPermsFeatures(locals.perms, "pokemon")) return json(noPermResult)

	const reqBody = await request.json()
	const filter: AllFilters = reqBody.filter

	let golbatFilters = [
		{
			pokemon: [

			]
		}
	]

	if (filter.type === "filtered") {
		golbatFilters = [
			{
				pokemon: [],
				iv: { min: 100, max: 100 }
			}
		]
	}

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
		filters: golbatFilters
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
