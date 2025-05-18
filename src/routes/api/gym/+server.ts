import { json } from '@sveltejs/kit';
import { query } from '@/lib/db.server';
import { checkPermsFeatures, noPermResult } from '@/lib/user/checkPerm';

export async function POST({ request, locals }) {
	if (!checkPermsFeatures(locals.perms, "gym")) return json(noPermResult)

	const reqBody = await request.json()
	const result = await query(
		"SELECT * FROM gym " +
		"WHERE lat BETWEEN ? AND ? " +
		"AND lon BETWEEN ? AND ? " +
		"AND deleted = 0 " +
		"LIMIT 10000",
		[reqBody.minLat, reqBody.maxLat, reqBody.minLon, reqBody.maxLon]
	)
	return json(result)
}