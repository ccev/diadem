import { error, json } from "@sveltejs/kit";
import { fetchKojiGeofences } from "@/lib/server/api/kojiApi";
import { getServerConfig } from "@/lib/services/config/config.server";

export async function GET(event) {
	const config = getServerConfig();
	if (!config.koji || !config.koji.url) return json([]);

	const data = await fetchKojiGeofences(event.fetch);
	if (!data) error(500);
	return json(data);
}
