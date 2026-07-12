import type { MasterStats } from "@/lib/server/api/queryStats";
import type { Incident } from "@/lib/types/mapObjectData/pokestop";
import type { PokemonVisual } from "@/lib/types/mapObjectData/pokemon";

export function getConfirmedInvasionReward(
	incident: Incident,
	lineups: MasterStats["activeCharacters"]
): PokemonVisual | undefined {
	const lineup = lineups.find((lineup) => lineup.character === incident.character);
	const first = lineup?.first[0];
	const second = lineup?.second[0];
	const third = lineup?.third[0];

	if (third?.encounter && lineup?.third.length === 1) {
		return toShadowPokemon(third.pokemon_id, third.form);
	}

	if (incident.confirmed && incident.slot_1_pokemon_id) {
		return toShadowPokemon(incident.slot_1_pokemon_id, incident.slot_1_form);
	}

	if (first?.encounter && !second?.encounter && !third?.encounter && lineup?.first.length === 1) {
		return toShadowPokemon(first.pokemon_id, first.form);
	}
}

function toShadowPokemon(pokemon_id: number, form: number | undefined): PokemonVisual {
	return {
		pokemon_id,
		form: form ?? 0,
		alignment: 1
	};
}
