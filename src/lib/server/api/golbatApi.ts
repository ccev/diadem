import { getServerConfig } from '@/lib/services/config/config.server';
import { env } from '$env/dynamic/private';

function getHeaders() {
	return {
		"Authorization": getServerConfig().golbat.auth,
	}
}

export async function getSinglePokemon(id: string, thisFetch: typeof fetch = fetch) {
	const url = new URL("api/pokemon/id/" + id, getServerConfig().golbat.url)

	return await thisFetch(
		url,
		{
			method: "GET",
			headers: getHeaders()
		}
	)
}

export async function getMultiplePokemon(body: any) {
	const url = new URL("api/pokemon/v2/scan", getServerConfig().golbat.url)

	return await fetch(
		url,
		{
			method: "POST",
			headers: getHeaders(),
			body: JSON.stringify(body)
		}
	)
}