import { error, json } from "@sveltejs/kit";
import { query } from "@/lib/server/db/external/internalQuery";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { Features } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("mapobjects");

export async function GET({ params, locals }) {
	const start = performance.now();
	if (!hasFeatureAnywhereServer(locals.perms, Features.WEATHER, locals.user)) error(401);
	const permCheckTime = performance.now();

	try {
		const result = await query("SELECT * FROM weather WHERE id = ?", [params.id]);

		log.info(
			"[weather] permcheck: %fms + query: %fms",
			(permCheckTime - start).toFixed(1),
			(performance.now() - permCheckTime).toFixed(1)
		);

		return json(result);
	} catch (e) {
		log.error("[weather] query failed", e);
		error(500);
	}
}
