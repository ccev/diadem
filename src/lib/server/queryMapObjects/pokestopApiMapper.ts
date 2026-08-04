import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { GolbatPokestopResult } from "@/lib/server/api/golbatApi";
import type { Incident, PokestopData } from "@/lib/types/mapObjectData/pokestop";

// Type-only imports keep this module runnable under bare vitest (no $app/*).
export function mapPokestop(p: GolbatPokestopResult): MinMapObject<PokestopData> {
	const { deleted, invasions, quest_rewards, alternative_quest_rewards, ...rest } = p;
	const pokestop = {
		...rest,
		deleted: deleted ? 1 : 0,
		// The wire delivers quest rewards as native JSON; parseQuestReward (via the
		// inherited prepare) expects the SQL rows' serialized string form.
		quest_rewards: quest_rewards != null ? JSON.stringify(quest_rewards) : undefined,
		alternative_quest_rewards:
			alternative_quest_rewards != null ? JSON.stringify(alternative_quest_rewards) : undefined,
		incident: (invasions ?? []).map((i): Incident => ({ ...i }))
	} as MinMapObject<PokestopData>;
	return pokestop;
}
