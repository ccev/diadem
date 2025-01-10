import { json } from '@sveltejs/kit';
import { query } from '@/lib/db.server';

export async function POST({ request }) {
	const reqBody = await request.json()
	const result = await query(
		"SELECT * FROM pokestop " +
		"LEFT JOIN incident ON incident.pokestop_id = pokestop.id " +
		"WHERE lat BETWEEN ? AND ? " +
		"AND lon BETWEEN ? AND ?" +
		"LIMIT 5000",
		[reqBody.minLat, reqBody.maxLat, reqBody.minLon, reqBody.maxLon]
	)
	return json(result)
}