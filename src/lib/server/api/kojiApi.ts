import { getServerConfig } from "@/lib/services/config/config.server";
import type { KojiFeatures, KojiReference } from "@/lib/features/koji";
import { getLogger } from "@/lib/utils/logger";
import type { ServerConfig } from "@/lib/services/config/configTypes";
import { buildUrl } from "@/lib/utils/url";

const log = getLogger("koji");

function getHeaders(): HeadersInit {
	return {
		Authorization: `Bearer ${getServerConfig().koji!.secret}`,
		"Content-Type": "application/json"
	};
}

async function getFeatures(thisFetch: typeof fetch): Promise<KojiFeatures | undefined> {
	const url = buildUrl(getServerConfig().koji!.url, {
		path:
			"/api/v1/geofence/FeatureCollection/" +
			getServerConfig().koji!.projectName +
			"?id=true&parent=true"
	});
	const response = await thisFetch(url, {
		headers: getHeaders()
	});

	if (!response.ok) {
		log.error(
			"Koji error while fetching features: %d (%s)",
			response.status,
			await response.text()
		);
		return;
	}

	const data = await response.json();
	return data?.data?.features ?? [];
}

export async function fetchKojiGeofences(
	thisFetch?: typeof fetch
): Promise<KojiFeatures | undefined> {
	const config = getServerConfig();
	if (!config.koji || !config.koji.url) {
		log.warning("Koji was called, but is not configured");
		return;
	}

	thisFetch = thisFetch ?? fetch;
	const features = await getFeatures(thisFetch);

	if (!features) {
		return;
	}

	return features;
}
