import { json } from '@sveltejs/kit';
import { query } from '@/lib/db.server';
import { hasFeatureAnywhere, noPermResult } from '@/lib/user/checkPerm';

export async function POST({ request, locals }) {
	if (!hasFeatureAnywhere(locals.perms, "station")) return json(noPermResult)

	const reqBody = await request.json()
	const result = await query(
		"SELECT * FROM station " +
		"WHERE lat BETWEEN ? AND ? " +
		"AND lon BETWEEN ? AND ? " +
		"AND end_time > UNIX_TIMESTAMP() " +
		"LIMIT 10000",
		[reqBody.minLat, reqBody.maxLat, reqBody.minLon, reqBody.maxLon]
	)
	return json(result)
}