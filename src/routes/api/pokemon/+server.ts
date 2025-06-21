import { json } from '@sveltejs/kit';
import {env} from '$env/dynamic/private'
import { getServerConfig } from '@/lib/config/config.server';
import type { AllFilters, FilterPokemon } from '@/lib/filters/filters';
import { checkFeatureInBounds, hasFeatureAnywhere, noPermResult } from '@/lib/user/checkPerm';
import type { Bounds } from '@/lib/mapObjects/mapBounds';
import type { MapObjectRequestData } from '@/lib/mapObjects/updateMapObject';

export async function POST({ request, locals }) {
	if (!hasFeatureAnywhere(locals.perms, "pokemon")) return json(noPermResult)

	const reqBody: MapObjectRequestData = await request.json()
	const filter = reqBody.filter as FilterPokemon

	const bounds = checkFeatureInBounds(locals.perms, "pokemon", reqBody)

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
			latitude: bounds.minLat,
			longitude: bounds.minLon,
		},
		max: {
			latitude: bounds.maxLat,
			longitude: bounds.maxLon,
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
