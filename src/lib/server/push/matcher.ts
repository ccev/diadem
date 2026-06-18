import type { MatchablePokemon, MinMax, PushAlertRule } from "./types";

function inRange(value: number | undefined, range: MinMax): boolean {
	if (value == null) return false;
	return value >= range.min && value <= range.max;
}

/** True if the rule constrains on IV-derived data (gates POKEMON_IV permission). */
export function ruleUsesIv(rule: PushAlertRule): boolean {
	return Boolean(rule.iv || rule.cp || rule.level || rule.size);
}

/** Returns the first enabled rule that matches, or undefined. */
export function matchRules(
	pokemon: MatchablePokemon,
	rules: PushAlertRule[]
): PushAlertRule | undefined {
	for (const rule of rules) {
		if (!rule.enabled) continue;

		if (
			rule.pokemon &&
			!rule.pokemon.find(
				(p) => p.pokemon_id === pokemon.pokemonId && (p.form == null || p.form === pokemon.form)
			)
		) {
			continue;
		}

		if (rule.iv && !inRange(pokemon.iv, rule.iv)) continue;
		if (rule.cp && !inRange(pokemon.cp, rule.cp)) continue;
		if (rule.level && !inRange(pokemon.level, rule.level)) continue;
		if (rule.size && !inRange(pokemon.size, rule.size)) continue;
		if (rule.gender && pokemon.gender != null && !rule.gender.includes(pokemon.gender)) continue;

		return rule;
	}
	return undefined;
}
