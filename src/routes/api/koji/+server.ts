import { fetchKojiGeofences } from "@/lib/server/api/kojiApi";
import { error, json } from "@sveltejs/kit";

export async function GET(event) {
	const data = await fetchKojiGeofences(event.fetch);
	if (!data) error(500);
	return json(data);
}
