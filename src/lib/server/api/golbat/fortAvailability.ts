import { fetchFortAvailability, fetchGolbatStatus } from "./http";
import type { FortAvailability } from "./types";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("golbat:fort");
export const FORT_API_REFRESH_SECONDS = 60;
const fortApiOptedOut = getServerConfig().golbat.fortApi === false;

let cachedAvailability: FortAvailability | undefined;
let maxFortResults = 0;

export function isFortApiEnabled() {
	return cachedAvailability !== undefined;
}

export function getCachedFortAvailability() {
	return cachedAvailability;
}

export function getFortApiScanLimit(limit: number) {
	return Math.min(limit, maxFortResults);
}

export async function refreshFortAvailability() {
	if (fortApiOptedOut) return;

	let availability: FortAvailability | undefined;
	let limit = 0;
	try {
		const status = await fetchGolbatStatus();
		if (
			status?.features.fort_in_memory &&
			Number.isInteger(status.limits.max_fort_results) &&
			status.limits.max_fort_results > 0
		) {
			availability = await fetchFortAvailability();
			limit = status.limits.max_fort_results;
		}
	} catch (err) {
		log.debug("Fort availability fetch failed: %s", err);
	}

	const nowEnabled = availability !== undefined;

	if (nowEnabled !== isFortApiEnabled()) {
		log.info(
			nowEnabled
				? "Golbat fort API detected, serving gyms/pokestops/stations from it"
				: "Golbat fort API unavailable, serving gyms/pokestops/stations from SQL"
		);
	}

	cachedAvailability = availability;
	if (nowEnabled) maxFortResults = limit;
}

export async function startFortApiDetection() {
	if (fortApiOptedOut) {
		log.info(
			"Golbat fort API disabled by config (server.golbat.fortApi = false), serving gyms/pokestops/stations from SQL"
		);
		return;
	}

	setInterval(() => {
		refreshFortAvailability().catch((err) =>
			log.error("Fort availability refresh failed: %s", err)
		);
	}, FORT_API_REFRESH_SECONDS * 1000).unref();

	await refreshFortAvailability();
}
