import { error, json } from '@sveltejs/kit';
import { fetchKojiGeofences } from '@/lib/server/api/kojiApi';

export async function GET(event) {
	const data = await fetchKojiGeofences(event.fetch)
	if (!data) error(500)
	return json(data)
}
