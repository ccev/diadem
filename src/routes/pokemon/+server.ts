import { json } from '@sveltejs/kit';
import {env} from '$env/dynamic/private';

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
	console.log(body)

	console.log()

	const response = await fetch(
		env.GOLBAT_BACKEND_URL,
		{
			method: "POST",
			headers: {
				"Authorization": env.GOLBAT_BACKEND_AUTH,
			},
			body: JSON.stringify(body)
		}
	)

	const results = await response.json()

	console.log("got " + results.length + " pokemon")
	return json(results, { status: 201 });
}
