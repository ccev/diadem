import { getConfig, setConfig } from "@/lib/services/config/config";
import { loadRemoteLocale } from "@/lib/services/ingameLocale";
import type { PageServerLoad } from "./$types";
import { getLogger } from "@/lib/server/logging";
import { getServerConfig } from "@/lib/services/config/config.server";
import { error } from "@sveltejs/kit";
import { getKojiGeofences } from "@/lib/features/koji";
import { fetchKojiGeofences } from "@/lib/server/api/kojiApi";
import { getFeatureJump } from "@/lib/utils/geo";

const log = getLogger("arealink")

export const load: PageServerLoad = async ({ params, fetch }) => {
	const areaName = params.area

	log.info("Direct area link called to %s", areaName)

	const features = await fetchKojiGeofences(fetch)

	if (!features) {
		log.error("Error fetching features, returning 404")
		error(404)
	}

	const feature = features.find(a => a.properties.name.toLowerCase().includes(areaName.toLowerCase()))

	if (!feature) {
		log.info("Area %s not found", areaName)
		error(404)
	}

	const jumpTo = getFeatureJump(feature)

	return { lat: jumpTo.coords.lat, lon: jumpTo.coords.lon, zoom: jumpTo.zoom, name: feature.properties.name };
};