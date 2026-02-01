import { json } from "@sveltejs/kit";
import { type MasterStats, queryMasterStats } from "@/lib/server/api/queryStats";
import TTLCache from "@isaacs/ttlcache";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("stats");

const UPDATE_INTERVAL = 60 * 60 * 1000;
const statsCache: TTLCache<"stats", MasterStats> = new TTLCache({
	max: 2,
	ttl: UPDATE_INTERVAL
});

export async function GET() {
	const stats = statsCache.get("stats");
	if (stats) {
		log.info("Serving cached master stats");
		return json(stats);
	}

	try {
		const start = performance.now();
		const stats = await queryMasterStats();
		log.info("Generated fresh master stats / time: %dms", (performance.now() - start).toFixed(1));
		statsCache.set("stats", stats);
		return json(stats);
	} catch (e) {
		log.error("Error while generating master stats: %e", e);
		return json({
			pokemon: {},
			generatedAt: 0
		});
	}
}
