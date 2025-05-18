import { json } from '@sveltejs/kit';
import { query } from '@/lib/db.server';
import { checkPermsFeatures, noPermResult } from '@/lib/user/checkPerm';

export async function GET({ params, locals }) {
	if (!checkPermsFeatures(locals.perms, "pokestop")) return json(noPermResult)

	const result = await query(
		'SELECT * FROM pokestop ' +
			'LEFT JOIN incident ON incident.pokestop_id = pokestop.id ' +
			'WHERE pokestop.id = ?',
		[params.id]
	);
	return json(result);
}