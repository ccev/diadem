import { getServerConfig } from "@/lib/services/config/config.server";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { Coords } from "@/lib/utils/coordinates";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import { getLogger } from "@/lib/utils/logger";

export type PokemonResponse = {
	pokemon: PokemonData[];
	examined: number;
	skipped: number;
	total: number;
};

const log = getLogger("golbat");
const config = getServerConfig().golbat;

async function callGolbat<T>(
	path: string,
	method: "GET" | "POST",
	body: BodyInit | undefined = undefined,
	thisFetch: typeof fetch = fetch
): Promise<T | undefined> {
	const start = performance.now();
	const url = new URL(path, config.url);

	const headers: HeadersInit = {};

	if (config.auth) {
		headers["Authorization"] = config.auth;
	}
	if (config.secret) {
		headers["X-Golbat-Secret"] = config.secret;
	}

	const response = await thisFetch(url, { method, body, headers });

	if (!response.ok) {
		log.error(
			"[%s] Golbat returned a bad status | %d (%s)",
			url.toString(),
			response.status,
			await response.text()
		);
		return undefined;
	}

	const result = await response.json();

	log.debug("[%s] Request took %fms", url.pathname, (performance.now() - start).toFixed(1));

	return result;
}

export async function getSinglePokemon(id: string, thisFetch: typeof fetch = fetch) {
	return await callGolbat<PokemonData>("api/pokemon/id/" + id, "GET", undefined, thisFetch);
}

export async function getMultiplePokemon(body: any) {
	return await callGolbat<PokemonResponse>("api/pokemon/v3/scan", "POST", JSON.stringify(body));
}

export async function searchGyms(query: string, coords: Coords, range: number) {
	const body = {
		filters: [
			{
				name: query,
				location_distance: {
					location: coords.internal(),
					distance: range
				}
			}
		],
		limit: 15
	};
	return await callGolbat<GymData[]>("api/gym/search", "POST", JSON.stringify(body));
}
