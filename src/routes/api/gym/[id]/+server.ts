import { json } from '@sveltejs/kit';
import { query } from '@/lib/db.server';
import { hasFeatureAnywhere, noPermResult } from '@/lib/user/checkPerm';

export async function GET({ params, locals }) {
	if (!hasFeatureAnywhere(locals.perms, "gym")) return json(noPermResult)

	const result = await query('SELECT * FROM gym ' + 'WHERE gym.id = ?', [params.id]);
	return json(result);
}