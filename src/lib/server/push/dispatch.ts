import { getClientConfig } from "@/lib/services/config/config.server";
import { Features } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";
import { matchRules, ruleUsesIv } from "./matcher";
import {
	alreadyAlerted,
	getActiveEntries,
	invalidateUser,
	underRateLimit,
	type Entry
} from "./registry";
import { sendToSubscription } from "./sender";
import type { MatchablePokemon, PushAlertRule, PushPayload } from "./types";
import { getIconPokemon } from "$lib/services/uicons.svelte";
import { mPokemon } from "$lib/services/ingameLocale";

const log = getLogger("push");

function getPushPokemonIconSet(): string {
	const uiconSets = getClientConfig().uiconSets;
	return (
		uiconSets.find((set) => typeof set.pokemon === "object" && set.pokemon?.default)?.id ??
		uiconSets.find((set) => set.base?.default)?.id ??
		uiconSets[0]?.id ??
		"DEFAULT"
	);
}

export type DispatchStats = {
	pokemon: number;
	entries: number;
	permissionDenied: number;
	ruleMiss: number;
	ivDenied: number;
	deduped: number;
	rateLimited: number;
	matched: number;
	sent: number;
	pruned: number;
};

function emptyStats(pokemon: MatchablePokemon[], entries = 0): DispatchStats {
	return {
		pokemon: pokemon.length,
		entries,
		permissionDenied: 0,
		ruleMiss: 0,
		ivDenied: 0,
		deduped: 0,
		rateLimited: 0,
		matched: 0,
		sent: 0,
		pruned: 0
	};
}

function buildPayload(pokemon: MatchablePokemon, rule: PushAlertRule): PushPayload {
	const ivText = pokemon.iv != null ? ` ${Math.round(pokemon.iv)}%` : "";
	const lvlText = pokemon.level != null ? ` L${pokemon.level}` : "";
	const title = mPokemon({ pokemon_id: pokemon.pokemonId, form: pokemon.form });
	return {
		title,
		body: `#${pokemon.pokemonId}${ivText}${lvlText}`,
		tag: `pokemon:${pokemon.encounterId}`,
		icon: getIconPokemon(
			{ pokemon_id: pokemon.pokemonId, form: pokemon.form },
			getPushPokemonIconSet()
		),
		url: `${getClientConfig().general.url ?? ""}/@/${pokemon.lat}/${pokemon.lon}/18`
	};
}

/** Strip IV-derived fields when the user is not permitted to see IV here. */
function viewFor(entry: Entry, pokemon: MatchablePokemon): MatchablePokemon {
	if (entry.context.isAllowedAt(Features.POKEMON_IV, pokemon.lat, pokemon.lon)) return pokemon;
	return {
		...pokemon,
		iv: undefined,
		atkIv: undefined,
		defIv: undefined,
		staIv: undefined,
		level: undefined,
		cp: undefined,
		size: undefined
	};
}

export async function dispatchPokemon(pokemon: MatchablePokemon[]): Promise<DispatchStats> {
	if (pokemon.length === 0) return emptyStats(pokemon);
	const entries = await getActiveEntries();
	const stats = emptyStats(pokemon, entries.length);
	if (entries.length === 0) {
		log.info(`Dispatch skipped: no active push entries for ${pokemon.length} pokemon`);
		return stats;
	}

	for (const p of pokemon) {
		for (const entry of entries) {
			if (!entry.context.isAllowedAt(Features.POKEMON, p.lat, p.lon)) {
				stats.permissionDenied += 1;
				continue;
			}

			const view = viewFor(entry, p);
			const rule = matchRules(view, entry.rules);
			if (!rule) {
				stats.ruleMiss += 1;
				continue;
			}
			if (ruleUsesIv(rule) && view.iv == null && view.cp == null) {
				stats.ivDenied += 1;
				continue;
			}

			if (alreadyAlerted(p.encounterId, rule.id, p.despawnMs)) {
				stats.deduped += 1;
				continue;
			}
			if (!underRateLimit(entry.userId)) {
				stats.rateLimited += 1;
				continue;
			}

			stats.matched += 1;
			const payload = buildPayload(view, rule);
			for (const sub of entry.subscriptions) {
				const { pruned } = await sendToSubscription(sub, payload);
				if (pruned) {
					stats.pruned += 1;
					invalidateUser(entry.userId);
				} else {
					stats.sent += 1;
				}
			}
		}
	}

	log.info(
		`Dispatch summary: pokemon=${stats.pokemon}, entries=${stats.entries}, matched=${stats.matched}, sent=${stats.sent}, permissionDenied=${stats.permissionDenied}, ruleMiss=${stats.ruleMiss}, ivDenied=${stats.ivDenied}, deduped=${stats.deduped}, rateLimited=${stats.rateLimited}, pruned=${stats.pruned}`
	);
	return stats;
}

/** Used by the test endpoint: push directly to a user's subscriptions. */
export async function dispatchTest(userId: string): Promise<number> {
	const { getPushSubscriptions } = await import("@/lib/server/db/internal/repository");
	const subs = await getPushSubscriptions(userId);
	const payload: PushPayload = {
		title: "Test push",
		body: "Web Push is working on this device.",
		tag: "test",
		url: getClientConfig().general.url ?? "/",
		icon: getIconPokemon({ pokemon_id: 1, form: 0 }, getPushPokemonIconSet())
	};
	let sent = 0;
	for (const sub of subs) {
		const { pruned } = await sendToSubscription(sub, payload);
		if (!pruned) sent += 1;
	}
	return sent;
}
