import { getLiveStats } from "@/lib/server/api/liveStats";
import { respond } from "@/lib/server/api/respond";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("livestats");

export async function GET({ request }) {
	try {
		const start = performance.now();

		const stats = await getLiveStats();

		log.info("Serving live stats / time: %dms", (performance.now() - start).toFixed(1));
		return respond(request, stats);
	} catch (e) {
		log.error("Error fetching live stats: %s", e);
		return respond(
			request,
			{ pokemon: {}, generatedAt: 0 },
			{
				status: 503,
				headers: { "Retry-After": "10" }
			}
		);
	}
}
