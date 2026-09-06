import { fetchKojiGeofences } from "@/lib/server/api/kojiApi";
import { respond } from "@/lib/server/api/respond";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { error } from "@sveltejs/kit";

export async function GET(event) {
	const data = await fetchKojiGeofences(event.fetch);
	if (!data) error(500);
	return respond(event.request, data, { headers: cacheHttpHeaders(60, 300, 3600) });
}
