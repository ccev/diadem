import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type {
	GolbatGymResult,
	GolbatPokestopResult,
	GolbatStationResult
} from "@/lib/server/api/golbat/types";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { StationData } from "@/lib/types/mapObjectData/station";

function blobToString(value: object | string | null | undefined) {
	if (value == null) return undefined;
	return typeof value === "string" ? value : JSON.stringify(value);
}

export function mapGym(g: GolbatGymResult): MinMapObject<GymData> {
	const { available_slots, deleted, defenders, rsvps, ...rest } = g;
	return {
		...rest,
		availble_slots: available_slots ?? undefined,
		deleted: deleted ? 1 : 0,
		defenders: defenders ?? undefined,
		rsvps: rsvps ?? undefined
	};
}

export function mapStation(s: GolbatStationResult): MinMapObject<StationData> {
	const {
		is_inactive,
		is_battle_available,
		stationed_pokemon,
		// API-only fields are not covered by inherited permission stripping.
		battles,
		battle_start,
		battle_end,
		...rest
	} = s;
	return {
		...rest,
		is_inactive: is_inactive ? 1 : 0,
		is_battle_available: is_battle_available ? 1 : 0,
		raw_stationed_pokemon: blobToString(stationed_pokemon)
	};
}

export function mapPokestop(p: GolbatPokestopResult): MinMapObject<PokestopData> {
	const {
		deleted,
		invasions,
		quest_rewards,
		alternative_quest_rewards,
		// API-only fields are not covered by inherited permission stripping.
		quest_pokemon_form_id,
		alternative_quest_pokemon_form_id,
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
		incident: invasions ?? []
	};
}
