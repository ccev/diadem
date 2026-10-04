import { getServerConfig } from "@/lib/services/config/config.server";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { Coords } from "@/lib/utils/coordinates";
import { getLogger } from "@/lib/utils/logger";
import type {
	FortAvailability,
	FortCombinedScanBody,
	FortScanBody,
	FortCombinedScanResponse,
	GolbatGymResult,
	GolbatPokestopResult,
	GolbatStationResult,
	GolbatStatus,
	GymScanResponse,
	PokemonResponse,
	PokemonScanBody,
	PokestopScanResponse,
	StationScanResponse
} from "./types";

const log = getLogger("golbat");
const config = getServerConfig().golbat;
let updatedAfterSupported = false;

export const golbatInFlight = { count: 0 };

export function getUpdatedAfter(since?: number): number | undefined {
	if (!updatedAfterSupported || typeof since !== "number") return undefined;
	const timestamp = Math.ceil(since);
	// Golbat uses strict >; keep Pokemon's inclusive >= since boundary.
	return Number.isSafeInteger(timestamp) && timestamp > 1 ? timestamp - 1 : undefined;
}

async function callGolbat<T>(
	path: string,
	method: "GET" | "POST",
	body?: Record<string, unknown>,
	thisFetch: typeof fetch = fetch
): Promise<T | undefined> {
	const start = performance.now();
	const url = new URL(path, config.url);

	const headers: HeadersInit = {
		"Content-Type": "application/json"
	};

	if (config.auth) {
		headers["Authorization"] = config.auth;
	}
	if (config.secret) {
		headers["X-Golbat-Secret"] = config.secret;
	}

	golbatInFlight.count += 1;
	try {
		const signal = AbortSignal.timeout(10_000);
		for (let attempt = 0; attempt < 2; attempt++) {
			const response = await thisFetch(url, {
				method,
				body: JSON.stringify(body),
				headers,
				signal
			});

			if (!response.ok) {
				const errorText = await response.text();
				if (attempt === 0 && response.status === 422 && body?.updated_after !== undefined) {
					try {
						const problem = JSON.parse(errorText);
						if (
							Array.isArray(problem?.errors) &&
							problem.errors.some(
								(error: { location?: unknown; message?: unknown } | null) =>
									error?.location === "body.updated_after" &&
									error.message === "unexpected property"
							)
						) {
							body = { ...body };
							delete body.updated_after;
							updatedAfterSupported = false;
							continue;
						}
					} catch {
						// Malformed problem JSON follows the normal error path.
					}
				}

				log.error(
					"[%s] Golbat returned a bad status | %d (%s)",
					url.toString(),
					response.status,
					errorText
				);
				return undefined;
			}

			const fetched = performance.now();
			const result = await response.json();
			const done = performance.now();

			log.debug(
				"[%s] Request took %fms (parse %fms, in flight %d)",
				url.pathname,
				(done - start).toFixed(1),
				(done - fetched).toFixed(1),
				golbatInFlight.count - 1
			);

			return result;
		}
	} finally {
		golbatInFlight.count -= 1;
	}
}

export function getSinglePokemon(id: string, thisFetch: typeof fetch = fetch) {
	return callGolbat<PokemonData>("api/pokemon/id/" + id, "GET", undefined, thisFetch);
}

export function getMultiplePokemon(body: PokemonScanBody) {
	return callGolbat<PokemonResponse>("api/pokemon/v3/scan", "POST", body);
}

export function searchGyms(query: string, coords: Coords, range: number) {
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
	return callGolbat<GymData[]>("api/gym/search", "POST", body);
}

export function scanGyms(body: FortScanBody) {
	return callGolbat<GymScanResponse>("api/gym/scan", "POST", body);
}

export function scanPokestops(body: FortScanBody) {
	return callGolbat<PokestopScanResponse>("api/pokestop/scan", "POST", body);
}

export function scanStations(body: FortScanBody) {
	return callGolbat<StationScanResponse>("api/station/scan", "POST", body);
}

export function scanForts(body: FortCombinedScanBody) {
	return callGolbat<FortCombinedScanResponse>("api/fort/scan", "POST", body);
}

export function getGolbatGym(id: string, thisFetch: typeof fetch = fetch) {
	return callGolbat<GolbatGymResult>("api/gym/id/" + id, "GET", undefined, thisFetch);
}

export function getGolbatPokestop(id: string, thisFetch: typeof fetch = fetch) {
	return callGolbat<GolbatPokestopResult>("api/pokestop/id/" + id, "GET", undefined, thisFetch);
}

export function getGolbatStation(id: string, thisFetch: typeof fetch = fetch) {
	return callGolbat<GolbatStationResult>("api/station/id/" + id, "GET", undefined, thisFetch);
}

export function fetchFortAvailability() {
	return callGolbat<FortAvailability>("api/fort/available", "GET");
}

export async function fetchGolbatStatus() {
	try {
		const status = await callGolbat<GolbatStatus>("api/status", "GET");
		updatedAfterSupported = status?.filters?.updated_after === true;
		return status;
	} catch (err) {
		updatedAfterSupported = false;
		throw err;
	}
}
