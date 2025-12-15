import { json } from "@sveltejs/kit";
import { type MasterStats, queryMasterStats } from "@/lib/server/api/queryStats";
import TTLCache from "@isaacs/ttlcache";
import { getLogger } from "@/lib/server/logging";
import {
	type FortLiveStats,
	type LiveStats,
	queryLiveFortStats,
	queryLivePokemonStats
} from "@/lib/server/api/queryLiveStats";

const log = getLogger("livestats");

const fortsCache: TTLCache<"forts", FortLiveStats> = new TTLCache({
	max: 2,
	ttl: 60 * 60 * 1000
});
const pokemonCache: TTLCache<"pokemon", number> = new TTLCache({
	max: 2,
	ttl: 60 * 1000
});

export async function GET() {
	try {
		const start = performance.now();

		let fortStats = fortsCache.get("forts");
		if (fortStats === undefined) {
			fortStats = await queryLiveFortStats();
			fortsCache.set("forts", fortStats);
		}

		let pokemonCount = pokemonCache.get("pokemon");
		if (pokemonCount === undefined) {
			pokemonCount = await queryLivePokemonStats();
			pokemonCache.set("pokemon", pokemonCount);
		}

		log.info("Serving live stats / time: %dms", (performance.now() - start).toFixed(1));
		return json({
			pokemon: pokemonCount,
			pokestops: fortStats.pokestops,
			gyms: fortStats.gyms
		} as LiveStats);
	} catch (e) {
		log.error("Error fetching live stats: %s", e);
		return json({
			pokemon: {},
			generatedAt: 0
		});
	}
}
