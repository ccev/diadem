import { getServerConfig } from "@/lib/services/config/config.server";
import type { KojiFeatures } from "@/lib/features/koji";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("koji");

export async function fetchKojiGeofences(
	thisFetch?: typeof fetch
): Promise<KojiFeatures | undefined> {
	const config = getServerConfig();
	if (!config.koji || !config.koji.url) {
		log.warning("Koji was called, but is not configured");
		return;
	}

	const url = config.koji.url + "/api/v1/geofence/FeatureCollection/" + config.koji.projectName;
	const response = await (thisFetch ?? fetch)(url, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${config.koji.secret}`,
			"Content-Type": "application/json"
		}
	});

	if (!response.ok) {
		log.error("Koji Error: %d (%s)", response.status, await response.text());
		return;
	}

	const data = await response.json();
	return data?.data?.features ?? ([] as KojiFeatures);
}