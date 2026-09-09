import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { GolbatPokestopResult } from "@/lib/server/api/golbatApi";
import type { Incident, PokestopData } from "@/lib/types/mapObjectData/pokestop";

export function blobToString(value: object | object[] | string | null | undefined) {
	if (value == null) return undefined;
	return typeof value === "string" ? value : JSON.stringify(value);
}

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
	return {
		...rest,
		deleted: deleted ? 1 : 0,
		quest_rewards: blobToString(quest_rewards),
		alternative_quest_rewards: blobToString(alternative_quest_rewards),
		showcase_focus: blobToString(showcase_focus),
		showcase_rankings: blobToString(showcase_rankings),
		incident: (invasions ?? []) as Incident[]
	} as MinMapObject<PokestopData>;
}
