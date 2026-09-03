import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { getServerConfig } from "@/lib/services/config/config.server";
import type { GymData, GymDefender, Rsvp } from "@/lib/types/mapObjectData/gym";
import type { Incident, PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { StationData } from "@/lib/types/mapObjectData/station";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { Coords } from "@/lib/utils/coordinates";
import { getLogger } from "@/lib/utils/logger";
import type { FortAvailability, FortScanBody } from "@/lib/server/queryMapObjects/queries";

export type PokemonResponse = {
	pokemon: MinMapObject<PokemonData>[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached?: boolean;
};

// Raw API records: like diadem's rows except the fields the mappers rename/reshape.
export type GolbatGymResult = Omit<
	MinMapObject<GymData>,
	"availble_slots" | "defenders_raw" | "defenders" | "raw_rsvps" | "rsvps" | "deleted"
> & {
	available_slots?: number | null;
	deleted: boolean;
	defenders?: GymDefender[] | null; // native JSON, not a string
	rsvps?: Rsvp[] | null; // native JSON, not a string
};

export type GolbatIncidentResult = Omit<Incident, "confirmed"> & { confirmed: boolean };

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
	invasions?: GolbatIncidentResult[];
	// native JSON on the wire (arrays of {type, info}), unlike the SQL rows' serialized strings
	quest_rewards?: object[] | null;
	alternative_quest_rewards?: object[] | null;
	// native JSON since Golbat's fort blob conversion; strings from older Golbat
	showcase_focus?: object | string | null;
	showcase_rankings?: object | string | null;
};

export type GolbatStationResult = Omit<
	MinMapObject<StationData>,
	"is_inactive" | "is_battle_available" | "stationed_pokemon" | "raw_stationed_pokemon"
> & {
	is_inactive: boolean;
	is_battle_available: boolean;
	// native JSON since Golbat's fort blob conversion; string from older Golbat
	stationed_pokemon?: object[] | string | null;
};

export type GymScanResponse = {
	gyms: GolbatGymResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached?: boolean; // present once the fort mirror of Golbat #392 lands
};
export type PokestopScanResponse = {
	pokestops: GolbatPokestopResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached?: boolean;
};
export type StationScanResponse = {
	stations: GolbatStationResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached?: boolean;
};

const log = getLogger("golbat");
const config = getServerConfig().golbat;

async function callGolbat<T>(
	path: string,
	method: "GET" | "POST",
	body: BodyInit | undefined = undefined,
	thisFetch: typeof fetch = fetch,
	quiet = false,
	signal?: AbortSignal
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

	const response = await thisFetch(url, { method, body, headers, signal });

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

export async function scanGyms(body: FortScanBody) {
	return await callGolbat<GymScanResponse>("api/gym/scan", "POST", JSON.stringify(body));
}

export async function scanPokestops(body: FortScanBody) {
	return await callGolbat<PokestopScanResponse>("api/pokestop/scan", "POST", JSON.stringify(body));
}

export async function scanStations(body: FortScanBody) {
	return await callGolbat<StationScanResponse>("api/station/scan", "POST", JSON.stringify(body));
}

export async function getGolbatGym(id: string, thisFetch: typeof fetch = fetch) {
	return await callGolbat<GolbatGymResult>("api/gym/id/" + id, "GET", undefined, thisFetch);
}

export async function getGolbatPokestop(id: string, thisFetch: typeof fetch = fetch) {
	return await callGolbat<GolbatPokestopResult>(
		"api/pokestop/id/" + id,
		"GET",
		undefined,
		thisFetch
	);
}

export async function getGolbatStation(id: string, thisFetch: typeof fetch = fetch) {
	return await callGolbat<GolbatStationResult>("api/station/id/" + id, "GET", undefined, thisFetch);
}

export async function fetchFortAvailability() {
	// Bounded so a hung Golbat connection during detection can't block initDiadem().
	return await callGolbat<FortAvailability>(
		"api/fort/available",
		"GET",
		undefined,
		fetch,
		true,
		AbortSignal.timeout(10_000)
	);
}
