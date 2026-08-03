import { fetchFortAvailability } from "@/lib/server/api/golbatApi";
import type { FortAvailability } from "@/lib/server/queryMapObjects/queries";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("golbat:fort");
const REFRESH_SECONDS = 60;

let fortApiEnabled = false;
let cachedAvailability: FortAvailability | undefined;

export function isFortApiEnabled() {
	return fortApiEnabled;
}

export function getCachedFortAvailability() {
	return cachedAvailability;
}

// Golbat gates every fort endpoint on fort_in_memory (503 when off, 404 on
// older versions), so a successful availability fetch doubles as detection.
export async function refreshFortAvailability() {
	let result: FortAvailability | undefined;
	try {
		result = await fetchFortAvailability();
	} catch (err) {
		log.debug("Fort availability fetch failed: %s", err);
		result = undefined;
	}

	const nowEnabled = result !== undefined;

	if (nowEnabled !== fortApiEnabled) {
		log.info(
			nowEnabled
				? "Golbat fort API detected, serving gyms/pokestops/stations from it"
				: "Golbat fort API unavailable, serving gyms/pokestops/stations from SQL"
		);
	}

	fortApiEnabled = nowEnabled;
	if (result) cachedAvailability = result;
}

export async function startFortApiDetection() {
	setInterval(() => {
		refreshFortAvailability().catch((err) =>
			log.error("Fort availability refresh failed: %s", err)
		);
	}, REFRESH_SECONDS * 1000)?.unref?.();

	await refreshFortAvailability();
}
