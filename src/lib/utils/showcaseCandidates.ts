import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";

/** Rank loaded candidates of one exact species/form, never a whole-area or mixed contest. */
export function rankShowcaseCandidates(
	candidates: PokemonData[],
	trainerId: string,
	pokemonId: number,
	form: number,
	minScore = 0,
	now = Date.now() / 1000
): PokemonData[] {
	if (!trainerId || !Number.isFinite(minScore) || minScore < 0 || !Number.isFinite(now)) return [];
	return candidates
		.filter((pokemon) => {
			const score = pokemon.personal_sizes?.[trainerId]?.score;
			return (
				pokemon.pokemon_id === pokemonId &&
				pokemon.form === form &&
				pokemon.expire_timestamp != null &&
				pokemon.expire_timestamp > now &&
				score != null &&
				Number.isFinite(score) &&
				score >= minScore
			);
		})
		.sort((a, b) => {
			const difference = b.personal_sizes![trainerId].score! - a.personal_sizes![trainerId].score!;
			return difference || a.id.localeCompare(b.id);
		});
}
