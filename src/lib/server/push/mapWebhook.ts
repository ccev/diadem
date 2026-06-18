import { golbatWebhookSchema } from "./schemas";
import type {
	MatchableInvasion,
	MatchableMaxBattle,
	MatchableObject,
	MatchablePokemon,
	MatchableQuest,
	MatchableRaid
} from "./types";

function num(v: unknown): number | undefined {
	return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function str(v: unknown): string | undefined {
	return typeof v === "string" ? v : undefined;
}

function bool(v: unknown): boolean {
	return v === true || v === 1;
}

/** Map a single golbat pokemon message. Returns null when unsuitable. */
function mapPokemonMessage(m: Record<string, unknown>): MatchablePokemon | null {
	// Skip nearby/cell spawns: their lat/lon is an approximate cell center,
	// not the real spawn point, so they are unsuitable for location alerts.
	const seenType = typeof m.seen_type === "string" ? m.seen_type : "";
	if (seenType === "nearby_cell" || seenType === "nearby_stop") return null;

	const pokemonId = num(m.pokemon_id);
	const lat = num(m.latitude);
	const lon = num(m.longitude);
	if (pokemonId == null || lat == null || lon == null) return null;

	const atkIv = num(m.individual_attack);
	const defIv = num(m.individual_defense);
	const staIv = num(m.individual_stamina);
	const iv =
		atkIv != null && defIv != null && staIv != null
			? Math.min(100, ((atkIv + defIv + staIv) / 45) * 100)
			: undefined;

	return {
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
	};
}

function mapRaidMessage(m: Record<string, unknown>): MatchableRaid | null {
	const gymId = str(m.gym_id);
	const lat = num(m.latitude);
	const lon = num(m.longitude);
	if (gymId == null || lat == null || lon == null) return null;

	const start = num(m.start) ?? num(m.raid_battle_timestamp) ?? 0;
	const end = num(m.end) ?? num(m.raid_end_timestamp) ?? 0;

	return {
		gymId,
		lat,
		lon,
		level: num(m.level) ?? 0,
		pokemonId: num(m.pokemon_id) ?? 0, // 0 = egg
		form: num(m.form) ?? 0,
		tempEvolutionId: num(m.evolution) ?? 0,
		startMs: start * 1000,
		endMs: end * 1000,
		gymName: str(m.gym_name),
		cp: num(m.cp),
		move1: num(m.move_1),
		move2: num(m.move_2),
		gender: num(m.gender),
		costume: num(m.costume),
		teamId: num(m.team_id)
	};
}

function mapQuestMessage(m: Record<string, unknown>): MatchableQuest | null {
	const pokestopId = str(m.pokestop_id);
	const lat = num(m.latitude);
	const lon = num(m.longitude);
	if (pokestopId == null || lat == null || lon == null) return null;

	const rewards = Array.isArray(m.rewards) ? (m.rewards as unknown[]) : [];
	const reward0 = (rewards[0] ?? {}) as Record<string, unknown>;
	const rewardType = num(reward0.type) ?? 0;
	const info = (reward0.info ?? {}) as Record<string, unknown>;

	return {
		pokestopId,
		lat,
		lon,
		title: str(m.title),
		target: num(m.target),
		rewardType,
		reward: {
			pokemonId: num(info.pokemon_id),
			form: num(info.form),
			itemId: num(info.item_id),
			amount: num(info.amount)
		},
		pokestopName: str(m.pokestop_name),
		updatedMs: (num(m.updated) ?? 0) * 1000
	};
}

function mapInvasionMessage(m: Record<string, unknown>): MatchableInvasion | null {
	const pokestopId = str(m.pokestop_id);
	const lat = num(m.latitude);
	const lon = num(m.longitude);
	if (pokestopId == null || lat == null || lon == null) return null;

	const character = num(m.character) ?? 0;
	// character 0 = not a grunt invasion (e.g. event / contest incident)
	if (character === 0) return null;

	const lineup = Array.isArray(m.lineup) ? (m.lineup as unknown[]) : [];
	const rewardPokemon = lineup
		.map((entry) => {
			const e = (entry ?? {}) as Record<string, unknown>;
			return { pokemon_id: num(e.pokemon_id) ?? 0, form: num(e.form) ?? 0 };
		})
		.filter((p) => p.pokemon_id !== 0);

	const expiration = num(m.expiration) ?? num(m.incident_expire_timestamp) ?? 0;

	return {
		id: str(m.id) ?? pokestopId,
		pokestopId,
		lat,
		lon,
		character,
		confirmed: bool(m.confirmed),
		displayType: num(m.display_type) ?? 0,
		expirationMs: expiration * 1000,
		rewardPokemon,
		pokestopName: str(m.pokestop_name)
	};
}

function mapMaxBattleMessage(m: Record<string, unknown>): MatchableMaxBattle | null {
	const stationId = str(m.id);
	const lat = num(m.latitude);
	const lon = num(m.longitude);
	if (stationId == null || lat == null || lon == null) return null;

	return {
		stationId,
		lat,
		lon,
		name: str(m.name),
		level: num(m.battle_level) ?? 0,
		pokemonId: num(m.battle_pokemon_id) ?? 0, // 0/null = no active boss
		form: num(m.battle_pokemon_form) ?? 0,
		breadMode: num(m.battle_pokemon_bread_mode) ?? 0,
		isActive: bool(m.is_battle_available),
		gmaxCount: num(m.total_stationed_gmax) ?? 0,
		startMs: (num(m.battle_start) ?? 0) * 1000,
		endMs: (num(m.battle_end) ?? 0) * 1000
	};
}

/**
 * Parse a Golbat webhook batch and return matchable pokemon only.
 * Kept for callers that only care about pokemon.
 */
export function mapGolbatPokemon(body: unknown): MatchablePokemon[] {
	const parsed = golbatWebhookSchema.safeParse(body);
	if (!parsed.success) return [];

	const result: MatchablePokemon[] = [];
	for (const entry of parsed.data) {
		if (entry.type !== "pokemon") continue;
		const mapped = mapPokemonMessage(entry.message as Record<string, unknown>);
		if (mapped) result.push(mapped);
	}
	return result;
}

/**
 * Parse a Golbat webhook batch and return all matchable objects, dispatching by
 * the envelope `type`. Unknown types and invalid entries are skipped.
 */
export function mapGolbatBatch(body: unknown): MatchableObject[] {
	const parsed = golbatWebhookSchema.safeParse(body);
	if (!parsed.success) return [];

	const result: MatchableObject[] = [];
	for (const entry of parsed.data) {
		const m = entry.message as Record<string, unknown>;
		switch (entry.type) {
			case "pokemon": {
				const data = mapPokemonMessage(m);
				if (data) result.push({ kind: "pokemon", data });
				break;
			}
			case "raid": {
				const data = mapRaidMessage(m);
				if (data) result.push({ kind: "raid", data });
				break;
			}
			case "quest": {
				const data = mapQuestMessage(m);
				if (data) result.push({ kind: "quest", data });
				break;
			}
			case "invasion": {
				const data = mapInvasionMessage(m);
				if (data) result.push({ kind: "invasion", data });
				break;
			}
			case "max_battle": {
				const data = mapMaxBattleMessage(m);
				if (data) result.push({ kind: "maxBattle", data });
				break;
			}
			default:
				break;
		}
	}
	return result;
}
