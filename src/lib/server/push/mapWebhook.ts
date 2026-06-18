import { golbatWebhookSchema } from "./schemas";
import type { MatchablePokemon } from "./types";

function num(v: unknown): number | undefined {
	return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/**
 * Parse a Golbat webhook batch and return matchable pokemon.
 * Golbat pokemon message fields: encounter_id, pokemon_id, latitude, longitude,
 * disappear_time (unix seconds), individual_attack/defense/stamina, pokemon_level,
 * cp, form, size, gender. IV fields are null until the mon is encountered.
 */
export function mapGolbatPokemon(body: unknown): MatchablePokemon[] {
	const parsed = golbatWebhookSchema.safeParse(body);
	if (!parsed.success) return [];

	const result: MatchablePokemon[] = [];
	for (const entry of parsed.data) {
		if (entry.type !== "pokemon") continue;
		const m = entry.message as Record<string, unknown>;

		// Skip nearby/cell spawns: their lat/lon is an approximate cell center,
		// not the real spawn point, so they are unsuitable for location alerts.
		const seenType = typeof m.seen_type === "string" ? m.seen_type : "";
		if (seenType === "nearby_cell" || seenType === "nearby_stop") continue;

		const pokemonId = num(m.pokemon_id);
		const lat = num(m.latitude);
		const lon = num(m.longitude);
		if (pokemonId == null || lat == null || lon == null) continue;

		const atkIv = num(m.individual_attack);
		const defIv = num(m.individual_defense);
		const staIv = num(m.individual_stamina);
		const iv =
			atkIv != null && defIv != null && staIv != null
				? Math.min(100, ((atkIv + defIv + staIv) / 45) * 100)
				: undefined;

		result.push({
			encounterId: typeof m.encounter_id === "string" ? m.encounter_id : String(m.encounter_id),
			pokemonId,
			form: num(m.form) ?? 0,
			lat,
			lon,
			despawnMs: (num(m.disappear_time) ?? 0) * 1000,
			iv,
			atkIv,
			defIv,
			staIv,
			level: num(m.pokemon_level),
			cp: num(m.cp),
			size: num(m.size),
			gender: num(m.gender)
		});
	}
	return result;
}
