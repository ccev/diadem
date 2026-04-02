import type { FiltersetInvasion } from "@/lib/features/filters/filtersets";
import type { Incident } from "@/lib/types/mapObjectData/pokestop";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";

export function getIncidentRewardPokemon(incident: Incident) {
	const rewardPokemon: { pokemon_id?: number; form?: number | null }[] = [
		{ pokemon_id: incident.slot_1_pokemon_id, form: incident.slot_1_form },
		{ pokemon_id: incident.slot_2_pokemon_id, form: incident.slot_2_form },
		{ pokemon_id: incident.slot_3_pokemon_id, form: incident.slot_3_form }
	];

	return rewardPokemon.filter((pokemon): pokemon is { pokemon_id: number; form?: number | null } =>
		Boolean(pokemon.pokemon_id)
	);
}

export function matchesInvasionRewards(
	rewards: FiltersetInvasion["rewards"] | undefined,
	incident: Incident
) {
	if (!rewards || rewards.length === 0) return false;

	const rewardPokemon = getIncidentRewardPokemon(incident);
	if (rewardPokemon.length === 0) return false;

	return rewards.some((reward) => {
		return rewardPokemon.some((pokemon) => {
			if (pokemon.pokemon_id !== reward.pokemon_id) return false;
			return reward.form === (pokemon.form ?? 0);
		});
	});
}

export function isMaxBattleActive(station: Partial<StationData>) {
	return Boolean(
		!station.is_inactive &&
			station.is_battle_available &&
			(station.start_time ?? 0) < currentTimestamp() &&
			(station.end_time ?? 0) > currentTimestamp()
	);
}
