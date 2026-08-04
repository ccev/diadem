import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { GolbatPokestopResult } from "@/lib/server/api/golbatApi";
import type { Incident, PokestopData } from "@/lib/types/mapObjectData/pokestop";

// The wire delivers blob columns as native JSON (older Golbat sent some of them
// as serialized strings); the SQL rows — and everything downstream of the
// mappers, like parseQuestReward and the inherited prepare() — expect the
// serialized string form. Accepts both wire generations.
export function blobToString(value: object | object[] | string | null | undefined) {
	if (value == null) return undefined;
	return typeof value === "string" ? value : JSON.stringify(value);
}

// Type-only imports keep this module runnable under bare vitest (no $app/*).
export function mapPokestop(p: GolbatPokestopResult): MinMapObject<PokestopData> {
	const {
		deleted,
		invasions,
		quest_rewards,
		alternative_quest_rewards,
		showcase_focus,
		showcase_rankings,
		...rest
	} = p;
	const pokestop = {
		...rest,
		deleted: deleted ? 1 : 0,
		quest_rewards: blobToString(quest_rewards),
		alternative_quest_rewards: blobToString(alternative_quest_rewards),
		showcase_focus: blobToString(showcase_focus),
		showcase_rankings: blobToString(showcase_rankings),
		incident: (invasions ?? []).map((i): Incident => ({ ...i }))
	} as MinMapObject<PokestopData>;
	return pokestop;
}
