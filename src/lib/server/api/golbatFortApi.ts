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
	const wasEnabled = fortApiEnabled;

	if (nowEnabled !== wasEnabled) {
		log.info(
			nowEnabled
				? "Golbat fort API detected, serving gyms/pokestops/stations from it"
				: "Golbat fort API unavailable, serving gyms/pokestops/stations from SQL"
		);
	}

	fortApiEnabled = nowEnabled;
	if (result) cachedAvailability = result;

	// enabled -> disabled: the hourly MasterStats snapshot was built with fort
	// availability merged in, so quests/contests/max-battles are empty SQL-side
	// placeholders until the next hourly refresh. Force one now so pick lists
	// don't sit empty for up to an hour. (disabled -> enabled needs no such kick:
	// mergeFortAvailability already overrides the stale SQL fields at request time.)
	//
	// Lazy import to break a load-time cycle: masterStatsProvider imports
	// queryStats, which imports this module for isFortApiEnabled/getCachedFortAvailability.
	if (wasEnabled && !nowEnabled) {
		import("@/lib/server/provider/masterStatsProvider")
			.then(({ masterstatsProvider }) => masterstatsProvider.refresh())
			.catch((err) =>
				log.error("Failed to refresh master stats after fort API went down: %s", err)
			);
	}
}

export async function startFortApiDetection() {
	setInterval(() => {
		refreshFortAvailability().catch((err) =>
			log.error("Fort availability refresh failed: %s", err)
		);
	}, REFRESH_SECONDS * 1000)?.unref?.();

	await refreshFortAvailability();
}
