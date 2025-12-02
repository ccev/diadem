import { json } from "@sveltejs/kit";
import { type MasterStats, queryMasterStats } from "@/lib/server/api/queryStats";
import TTLCache from "@isaacs/ttlcache";

const UPDATE_INTERVAL = 60 * 60;
const statsCache: TTLCache<"stats", MasterStats> = new TTLCache({
	max: 2,
	ttl: UPDATE_INTERVAL
});

export async function GET() {
	const stats = statsCache.get("stats");
	if (stats) return json(stats);

	try {
		const stats = await queryMasterStats();
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
