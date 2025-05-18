import { json } from '@sveltejs/kit';
import { query } from '@/lib/db.server';
import { checkPermsFeatures, noPermResult } from '@/lib/user/checkPerm';

export async function GET({ params, locals }) {
	if (!checkPermsFeatures(locals.perms, "station")) return json(noPermResult)

	const result = await query('SELECT * FROM station ' + 'WHERE station.id = ?', [params.id]);
	return json(result);
}