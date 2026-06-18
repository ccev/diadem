import { getPushAddress } from "./address";
import {
	matchInvasionRule,
	matchMaxBattleRule,
	matchPokemonRule,
	matchQuestRule,
	matchRaidRule,
	ruleUsesIv
} from "./matcher";
import {
	alreadyAlerted,
	getActiveEntries,
	invalidateUser,
	underRateLimit,
	type Entry
} from "./registry";
import { sendToSubscription } from "./sender";
import type {
	MatchableInvasion,
	MatchableMaxBattle,
	MatchableObject,
	MatchablePokemon,
	MatchableQuest,
	MatchableRaid,
	PushPayload
} from "./types";
import { getClientConfig } from "@/lib/services/config/config.server";
import { Features, type FeaturesKey } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";
import {
	getIconInvasion,
	getIconPokemon,
	getIconRaidEgg,
	getIconReward,
	getIconStation
} from "$lib/services/uicons.svelte";
import { mCharacter, mPokemon, mQuest, mRaid } from "$lib/services/ingameLocale";

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
	objects: number;
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

function emptyStats(objects: number, entries = 0): DispatchStats {
	return {
		objects,
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

const KIND_FEATURE: Record<MatchableObject["kind"], FeaturesKey> = {
	pokemon: Features.POKEMON,
	raid: Features.RAID,
	quest: Features.QUEST,
	invasion: Features.INVASION,
	maxBattle: Features.MAX_BATTLE
};

function latLon(obj: MatchableObject): { lat: number; lon: number } {
	return { lat: obj.data.lat, lon: obj.data.lon };
}

/** Strip IV-derived fields when the user is not permitted to see IV here. */
function viewForPokemon(entry: Entry, pokemon: MatchablePokemon): MatchablePokemon {
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

function dedupeKey(obj: MatchableObject): { key: string; expiryMs: number } {
	const now = Date.now();
	switch (obj.kind) {
		case "pokemon":
			return { key: `pokemon:${obj.data.encounterId}`, expiryMs: obj.data.despawnMs };
		case "raid":
			return { key: `raid:${obj.data.gymId}:${obj.data.pokemonId}`, expiryMs: obj.data.endMs };
		case "quest":
			return {
				key: `quest:${obj.data.pokestopId}:${obj.data.title ?? ""}`,
				expiryMs: obj.data.updatedMs + 6 * 60 * 60 * 1000
			};
		case "invasion":
			return { key: `invasion:${obj.data.id}`, expiryMs: obj.data.expirationMs };
		case "maxBattle":
			return {
				key: `maxBattle:${obj.data.stationId}:${obj.data.pokemonId}`,
				expiryMs: obj.data.endMs > 0 ? obj.data.endMs : now + 60 * 60 * 1000
			};
	}
}

function clientUrl(lat: number, lon: number): string {
	return `${getClientConfig().general.url ?? ""}/@/${lat}/${lon}/18`;
}

async function buildPokemonPayload(
	p: MatchablePokemon,
	tag: string
): Promise<PushPayload> {
	const ivText = p.iv != null ? ` ${Math.round(p.iv)}%` : "";
	const lvlText = p.level != null ? ` L${p.level}` : "";
	const icon = getIconPokemon(
		{ pokemon_id: p.pokemonId, form: p.form },
		getPushPokemonIconSet()
	);
	const address = (await getPushAddress(p.lat, p.lon)) ?? undefined;
	return finalizePayload({
		kind: "pokemon",
		title: mPokemon({ pokemon_id: p.pokemonId, form: p.form }),
		body: `#${p.pokemonId}${ivText}${lvlText}`,
		icon,
		lat: p.lat,
		lon: p.lon,
		tag,
		address
	});
}

async function buildRaidPayload(r: MatchableRaid, tag: string): Promise<PushPayload> {
	const isEgg = r.pokemonId === 0;
	const title = isEgg
		? mRaid(r.level)
		: mPokemon({
				pokemon_id: r.pokemonId,
				form: r.form,
				temp_evolution_id: r.tempEvolutionId
			});
	const icon = isEgg
		? getIconRaidEgg(r.level)
		: getIconPokemon(
				{ pokemon_id: r.pokemonId, form: r.form, temp_evolution_id: r.tempEvolutionId },
				getPushPokemonIconSet()
			);
	const address = (await getPushAddress(r.lat, r.lon)) ?? undefined;
	return finalizePayload({
		kind: "raid",
		title,
		body: mRaid(r.level),
		icon,
		lat: r.lat,
		lon: r.lon,
		tag,
		address
	});
}

async function buildQuestPayload(q: MatchableQuest, tag: string): Promise<PushPayload> {
	const icon = getIconReward(q.rewardType, {
		item_id: q.reward.itemId,
		pokemon_id: q.reward.pokemonId,
		form: q.reward.form,
		amount: q.reward.amount
	});
	const text = mQuest(q.title, q.target);
	const address = (await getPushAddress(q.lat, q.lon)) ?? undefined;
	return finalizePayload({
		kind: "quest",
		title: text,
		body: text,
		icon,
		lat: q.lat,
		lon: q.lon,
		tag,
		address
	});
}

async function buildInvasionPayload(
	i: MatchableInvasion,
	tag: string
): Promise<PushPayload> {
	const icon = getIconInvasion(i.character, i.confirmed);
	const address = (await getPushAddress(i.lat, i.lon)) ?? undefined;
	return finalizePayload({
		kind: "invasion",
		title: mCharacter(i.character),
		body: i.confirmed ? "Confirmed invasion" : "Invasion",
		icon,
		lat: i.lat,
		lon: i.lon,
		tag,
		address
	});
}

async function buildMaxBattlePayload(
	m: MatchableMaxBattle,
	tag: string
): Promise<PushPayload> {
	const hasBoss = m.pokemonId !== 0;
	const title = hasBoss
		? mPokemon({ pokemon_id: m.pokemonId, form: m.form, bread_mode: m.breadMode })
		: (m.name ?? "Max Battle");
	const icon = hasBoss
		? getIconPokemon(
				{ pokemon_id: m.pokemonId, form: m.form, bread_mode: m.breadMode },
				getPushPokemonIconSet()
			)
		: getIconStation(true);
	const address = (await getPushAddress(m.lat, m.lon)) ?? undefined;
	return finalizePayload({
		kind: "maxBattle",
		title,
		body: "Max Battle",
		icon,
		lat: m.lat,
		lon: m.lon,
		tag,
		address
	});
}

function finalizePayload(input: {
	kind: string;
	title: string;
	body: string;
	icon: string;
	lat: number;
	lon: number;
	tag: string;
	address?: string;
}): PushPayload {
	const body = input.address ? `${input.body}\n${input.address}` : input.body;
	return {
		kind: input.kind,
		title: input.title,
		body,
		tag: input.tag,
		url: clientUrl(input.lat, input.lon),
		icon: input.icon,
		image: input.icon,
		address: input.address
	};
}

async function buildPayload(obj: MatchableObject, tag: string): Promise<PushPayload> {
	switch (obj.kind) {
		case "pokemon":
			return buildPokemonPayload(obj.data, tag);
		case "raid":
			return buildRaidPayload(obj.data, tag);
		case "quest":
			return buildQuestPayload(obj.data, tag);
		case "invasion":
			return buildInvasionPayload(obj.data, tag);
		case "maxBattle":
			return buildMaxBattlePayload(obj.data, tag);
	}
}

/**
 * Match an object against an entry's rules for that kind. Returns whether a rule
 * matched and (for pokemon) an IV-stripped view to use when building the
 * payload. Updates stats for misses.
 */
function matchForEntry(
	obj: MatchableObject,
	entry: Entry,
	stats: DispatchStats
): { matched: boolean; payloadObj: MatchableObject } {
	switch (obj.kind) {
		case "pokemon": {
			const view = viewForPokemon(entry, obj.data);
			const rule = matchPokemonRule(view, entry.rules.pokemon);
			if (!rule) {
				stats.ruleMiss += 1;
				return { matched: false, payloadObj: obj };
			}
			if (ruleUsesIv(rule) && view.iv == null && view.cp == null) {
				stats.ivDenied += 1;
				return { matched: false, payloadObj: obj };
			}
			return { matched: true, payloadObj: { kind: "pokemon", data: view } };
		}
		case "raid": {
			const rule = matchRaidRule(obj.data, entry.rules.raid);
			if (!rule) stats.ruleMiss += 1;
			return { matched: Boolean(rule), payloadObj: obj };
		}
		case "quest": {
			const rule = matchQuestRule(obj.data, entry.rules.quest);
			if (!rule) stats.ruleMiss += 1;
			return { matched: Boolean(rule), payloadObj: obj };
		}
		case "invasion": {
			const rule = matchInvasionRule(obj.data, entry.rules.invasion);
			if (!rule) stats.ruleMiss += 1;
			return { matched: Boolean(rule), payloadObj: obj };
		}
		case "maxBattle": {
			const rule = matchMaxBattleRule(obj.data, entry.rules.maxBattle);
			if (!rule) stats.ruleMiss += 1;
			return { matched: Boolean(rule), payloadObj: obj };
		}
	}
}

export async function dispatchObjects(objects: MatchableObject[]): Promise<DispatchStats> {
	if (objects.length === 0) return emptyStats(0);
	const entries = await getActiveEntries();
	const stats = emptyStats(objects.length, entries.length);
	if (entries.length === 0) {
		log.info(`Dispatch skipped: no active push entries for ${objects.length} objects`);
		return stats;
	}

	for (const obj of objects) {
		const { lat, lon } = latLon(obj);
		const feature = KIND_FEATURE[obj.kind];

		for (const entry of entries) {
			if (!entry.context.isAllowedAt(feature, lat, lon)) {
				stats.permissionDenied += 1;
				continue;
			}

			const { matched, payloadObj } = matchForEntry(obj, entry, stats);
			if (!matched) continue;

			const { key, expiryMs } = dedupeKey(obj);
			// Scope dedupe per-user: one alert per object per user. Without the
			// userId the first matching user would dedupe out everyone else.
			if (alreadyAlerted(`${entry.userId}:${key}`, "", expiryMs)) {
				stats.deduped += 1;
				continue;
			}
			if (!underRateLimit(entry.userId)) {
				stats.rateLimited += 1;
				continue;
			}

			stats.matched += 1;
			const payload = await buildPayload(payloadObj, key);
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
		`Dispatch summary: objects=${stats.objects}, entries=${stats.entries}, matched=${stats.matched}, sent=${stats.sent}, permissionDenied=${stats.permissionDenied}, ruleMiss=${stats.ruleMiss}, ivDenied=${stats.ivDenied}, deduped=${stats.deduped}, rateLimited=${stats.rateLimited}, pruned=${stats.pruned}`
	);
	return stats;
}

/** Used by the test endpoint: push directly to a user's subscriptions. */
export async function dispatchTest(userId: string): Promise<number> {
	const { getPushSubscriptions } = await import("@/lib/server/db/internal/repository");
	const subs = await getPushSubscriptions(userId);
	const payload: PushPayload = {
		kind: "test",
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
