import { json } from '@sveltejs/kit';
import { query } from '@/lib/db.server';
import { hasFeatureAnywhere, noPermResult } from '@/lib/user/checkPerm';

export async function GET({ params, locals }) {
	if (!hasFeatureAnywhere(locals.perms, "weather")) return json(noPermResult)

	const result = await query(
		'SELECT * FROM weather ' +
			'WHERE id = ?',
		[params.id]
	);
	return json(result);
}