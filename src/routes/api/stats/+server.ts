import { json } from "@sveltejs/kit";
import { type MasterStats, queryMasterStats } from "@/lib/server/api/queryStats";
import TTLCache from "@isaacs/ttlcache";
import { getLogger } from '@/lib/server/logging';

const log = getLogger("stats")

const UPDATE_INTERVAL = 60 * 60 * 1000;
const statsCache: TTLCache<"stats", MasterStats> = new TTLCache({
	max: 2,
	ttl: UPDATE_INTERVAL
});

export async function GET() {
	const stats = statsCache.get("stats");
	log.info("Serving cached master stats")
	if (stats) return json(stats);

	try {
		const start = performance.now()
		const stats = await queryMasterStats();
		log.info("Generated fresh master stats / time: %dms", (performance.now() - start).toFixed(1))
		statsCache.set("stats", stats);
		return json(stats);
	} catch (e) {
		console.error("Error fetching stats", e);
		return json({
			pokemon: {},
			generatedAt: 0
		});
	}
}
