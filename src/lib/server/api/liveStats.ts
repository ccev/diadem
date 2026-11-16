import { createHash } from "node:crypto";
import { getServerConfig } from "@/lib/services/config/config.server";
import { liveStatsSchema } from "@/lib/services/config/readLoadConfig";
import { LiveStatsCache } from "@/lib/server/coordination/liveStatsCache";
import { queryLiveFortStats, queryLivePokemonStats } from "./queryLiveStats";

const config = getServerConfig();
const tuning = liveStatsSchema.parse(config.liveStats ?? {});
// Namespace by sources, credentials and cache policy. Only the digest crosses IPC.
// No request identity is needed: these existing counters are global, not authorized map results.
const namespace = createHash("sha256")
	.update(JSON.stringify([config.db, config.golbat, tuning]))
	.digest("hex");
const pokemon = new LiveStatsCache(
	`live:v1:${namespace}:pokemon`,
	tuning.pokemonRefreshSeconds * 1000,
	tuning.staleSeconds * 1000,
	() => queryLivePokemonStats()
);
const forts = new LiveStatsCache(
	`live:v1:${namespace}:forts`,
	tuning.fortRefreshSeconds * 1000,
	tuning.staleSeconds * 1000,
	() => queryLiveFortStats()
);

export async function getLiveStats() {
	const [pokemonCount, fortStats] = await Promise.all([pokemon.get(), forts.get()]);
	return { pokemon: pokemonCount, ...fortStats };
}
