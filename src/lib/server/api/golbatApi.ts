import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { getServerConfig } from "@/lib/services/config/config.server";
import type { GymData, GymDefender, Rsvp } from "@/lib/types/mapObjectData/gym";
import type { Incident, PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { StationData } from "@/lib/types/mapObjectData/station";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { Coords } from "@/lib/utils/coordinates";
import { getLogger } from "@/lib/utils/logger";
import type {
	FortAvailability,
	FortCombinedScanBody,
	FortScanBody,
	FortTypeScanStats,
	GolbatStatus,
	PokemonScanBody
} from "@/lib/server/queryMapObjects/queries";

export type PokemonResponse = {
	pokemon: MinMapObject<PokemonData>[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached?: boolean;
};

export type GolbatGymResult = Omit<
	MinMapObject<GymData>,
	"availble_slots" | "defenders_raw" | "defenders" | "raw_rsvps" | "rsvps" | "deleted"
> & {
	available_slots?: number | null;
	deleted: boolean;
	defenders?: GymDefender[] | null;
	rsvps?: Rsvp[] | null;
};

export type GolbatPokestopResult = Omit<
	MinMapObject<PokestopData>,
	| "incident"
	| "deleted"
	| "quest_rewards"
	| "alternative_quest_rewards"
	| "showcase_focus"
	| "showcase_rankings"
> & {
	deleted: boolean;
	invasions?: Incident[];
	quest_rewards?: object[] | string | null;
	alternative_quest_rewards?: object[] | string | null;
	quest_pokemon_form_id?: number | null;
	alternative_quest_pokemon_form_id?: number | null;
	showcase_focus?: object | string | null;
	showcase_rankings?: object | string | null;
};

export type GolbatStationResult = Omit<
	MinMapObject<StationData>,
	| "is_inactive"
	| "is_battle_available"
	| "stationed_pokemon"
	| "raw_stationed_pokemon"
	| "battle_start"
	| "battle_end"
> & {
	is_inactive: boolean;
	is_battle_available: boolean;
	stationed_pokemon?: object[] | string | null;
	battles?: object[];
	battle_start?: number | null;
	battle_end?: number | null;
};

export type GymScanResponse = {
	gyms: GolbatGymResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached: boolean;
};
export type PokestopScanResponse = {
	pokestops: GolbatPokestopResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached: boolean;
};
export type StationScanResponse = {
	stations: GolbatStationResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached: boolean;
};
export type FortCombinedScanResponse = {
	gyms: GolbatGymResult[];
	pokestops: GolbatPokestopResult[];
	stations: GolbatStationResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached: boolean;
	gyms_stats: FortTypeScanStats;
	pokestops_stats: FortTypeScanStats;
	stations_stats: FortTypeScanStats;
};

const log = getLogger("golbat");
const config = getServerConfig().golbat;

/** Golbat calls (HTTP or gRPC) awaiting a response; logged so contended timings are recognisable. */
export const golbatInFlight = { count: 0 };

async function callGolbat<T>(
	path: string,
	method: "GET" | "POST",
	body: BodyInit | undefined = undefined,
	thisFetch: typeof fetch = fetch,
	quiet = false
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
		const response = await thisFetch(url, {
			method,
			body,
			headers,
			signal: AbortSignal.timeout(10_000)
		});

		if (!response.ok) {
			if (!quiet) {
				log.error(
					"[%s] Golbat returned a bad status | %d (%s)",
					url.toString(),
					response.status,
					await response.text()
				);
			} else {
				log.debug("[%s] Golbat returned a bad status | %d", url.toString(), response.status);
			}
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
	} finally {
		golbatInFlight.count -= 1;
	}
}

export function getSinglePokemon(id: string, thisFetch: typeof fetch = fetch) {
	return callGolbat<PokemonData>("api/pokemon/id/" + id, "GET", undefined, thisFetch);
}

export function getMultiplePokemon(body: PokemonScanBody) {
	return callGolbat<PokemonResponse>("api/pokemon/v3/scan", "POST", JSON.stringify(body));
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
	return callGolbat<GymData[]>("api/gym/search", "POST", JSON.stringify(body));
}

export function scanGyms(body: FortScanBody) {
	return callGolbat<GymScanResponse>("api/gym/scan", "POST", JSON.stringify(body));
}

export function scanPokestops(body: FortScanBody) {
	return callGolbat<PokestopScanResponse>("api/pokestop/scan", "POST", JSON.stringify(body));
}

export function scanStations(body: FortScanBody) {
	return callGolbat<StationScanResponse>("api/station/scan", "POST", JSON.stringify(body));
}

export function scanForts(body: FortCombinedScanBody) {
	// quiet: a Golbat without the combined endpoint answers 404, and the caller falls back
	return callGolbat<FortCombinedScanResponse>(
		"api/fort/scan",
		"POST",
		JSON.stringify(body),
		fetch,
		true
	);
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
	return callGolbat<FortAvailability>("api/fort/available", "GET", undefined, fetch, true);
}

export function fetchGolbatStatus() {
	return callGolbat<GolbatStatus>("api/status", "GET", undefined, fetch, true);
}
