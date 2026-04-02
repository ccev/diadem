import { json } from "@sveltejs/kit";
import { type MasterStats, queryMasterStats } from "@/lib/server/api/queryStats";
import TTLCache from "@isaacs/ttlcache";
import { getLogger } from "@/lib/utils/logger";
import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import { masterstatsProvider } from "@/lib/server/provider/masterStatsProvider";

export async function GET() {
	try {
		const stats = await masterstatsProvider.get();
		return json(stats);
	} catch (e) {
		return json({
			pokemon: {},
			generatedAt: 0
		});
	}
}
