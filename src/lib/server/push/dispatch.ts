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

const log = getLogger("push");

function buildPayload(pokemon: MatchablePokemon, rule: PushAlertRule): PushPayload {
	const ivText = pokemon.iv != null ? ` ${Math.round(pokemon.iv)}%` : "";
	const lvlText = pokemon.level != null ? ` L${pokemon.level}` : "";
	const title = rule.name || `Pokémon #${pokemon.pokemonId}`;
	return {
		title,
		body: `#${pokemon.pokemonId}${ivText}${lvlText}`,
		tag: `pokemon:${pokemon.encounterId}`,
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

export async function dispatchPokemon(pokemon: MatchablePokemon[]): Promise<void> {
	if (pokemon.length === 0) return;
	const entries = await getActiveEntries();
	if (entries.length === 0) return;

	for (const p of pokemon) {
		for (const entry of entries) {
			if (!entry.context.isAllowedAt(Features.POKEMON, p.lat, p.lon)) continue;

			const view = viewFor(entry, p);
			const rule = matchRules(view, entry.rules);
			if (!rule) continue;
			if (ruleUsesIv(rule) && view.iv == null && view.cp == null) continue;

			if (alreadyAlerted(p.encounterId, rule.id, p.despawnMs)) continue;
			if (!underRateLimit(entry.userId)) continue;

			const payload = buildPayload(view, rule);
			for (const sub of entry.subscriptions) {
				const { pruned } = await sendToSubscription(sub, payload);
				if (pruned) invalidateUser(entry.userId);
			}
		}
	}
}

/** Used by the test endpoint: push directly to a user's subscriptions. */
export async function dispatchTest(userId: string): Promise<number> {
	const { getPushSubscriptions } = await import("@/lib/server/db/internal/repository");
	const subs = await getPushSubscriptions(userId);
	const payload: PushPayload = {
		title: "Test push",
		body: "Web Push is working on this device.",
		tag: "test",
		url: getClientConfig().general.url ?? "/"
	};
	let sent = 0;
	for (const sub of subs) {
		const { pruned } = await sendToSubscription(sub, payload);
		if (!pruned) sent += 1;
	}
	return sent;
}
