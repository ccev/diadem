import { json } from '@sveltejs/kit';
import { query } from '@/lib/server/db/external/internalQuery';
import { hasFeatureAnywhere } from '@/lib/services/user/checkPerm';
import { noPermResult } from '@/lib/server/api/results';
import { getLogger } from '@/lib/server/logging';

const log = getLogger("mapobjects")

export async function GET({ params, locals }) {
	const start = performance.now();
	if (!hasFeatureAnywhere(locals.perms, "weather")) return json(noPermResult())
	const permCheckTime = performance.now()

	const result = await query(
		'SELECT * FROM weather ' +
			'WHERE id = ?',
		[params.id]
	);

	log.info(
		"[weather] permcheck: %fms + query: %fms / error: %s",
		(permCheckTime - start).toFixed(1),
		(performance.now() - permCheckTime).toFixed(1),
		result.error ?? "no"
	);

	return json(result);
}