import {
	getPushAlerts,
	getPushSubscriptions,
	getSubscribedUserIds
} from "@/lib/server/db/internal/repository";
import { getServerConfig } from "@/lib/services/config/config.server";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { getLogger } from "@/lib/utils/logger";
import { getSharedPushContext } from "./permissions";
import type { PushAlertRule, StoredSubscription } from "./types";

const log = getLogger("push");

const ENTRY_TTL_MS = 60_000;
const DEDUPE_MAX = 50_000;

type Entry = {
	userId: string;
	rules: PushAlertRule[];
	subscriptions: StoredSubscription[];
	context: FeaturePermissionContext;
	expiresAt: number;
};

const entries = new Map<string, Entry>();
const inFlightEntries = new Map<string, Promise<Entry | null>>();
const rateState = new Map<string, { windowStart: number; count: number }>();
const dedupe = new Map<string, number>(); // `${encounterId}:${ruleId}` -> despawnMs

let subscriberIds: string[] = [];
let subscriberIdsExpiresAt = 0;

export function invalidateUser(userId: string): void {
	entries.delete(userId);
	subscriberIdsExpiresAt = 0; // force subscriber list refresh
}

async function buildEntry(userId: string): Promise<Entry | null> {
	const [rules, subscriptions, context] = await Promise.all([
		getPushAlerts(userId),
		getPushSubscriptions(userId),
		getSharedPushContext()
	]);
	const enabledRules = rules.filter((r) => r.enabled);
	if (enabledRules.length === 0 || subscriptions.length === 0) return null;

	return {
		userId,
		rules: enabledRules,
		subscriptions,
		context,
		expiresAt: Date.now() + ENTRY_TTL_MS
	};
}

async function getEntry(userId: string): Promise<Entry | null> {
	const cached = entries.get(userId);
	if (cached && cached.expiresAt > Date.now()) return cached;

	let building = inFlightEntries.get(userId);
	if (!building) {
		building = buildEntry(userId).finally(() => inFlightEntries.delete(userId));
		inFlightEntries.set(userId, building);
	}
	const fresh = await building;
	if (fresh) entries.set(userId, fresh);
	else entries.delete(userId);
	return fresh;
}

/** All currently-eligible subscriber entries (rules + subs + perms). */
export async function getActiveEntries(): Promise<Entry[]> {
	if (subscriberIdsExpiresAt <= Date.now()) {
		try {
			subscriberIds = await getSubscribedUserIds();
			subscriberIdsExpiresAt = Date.now() + ENTRY_TTL_MS;
		} catch (err) {
			log.warning(`Failed to refresh subscriber ids: ${err}`);
		}
	}
	const result: Entry[] = [];
	for (const id of subscriberIds) {
		const entry = await getEntry(id);
		if (entry) result.push(entry);
	}
	return result;
}

/** Returns true if this (encounter, rule) was already alerted. Records it otherwise. */
export function alreadyAlerted(encounterId: string, ruleId: string, despawnMs: number): boolean {
	const key = `${encounterId}:${ruleId}`;
	const now = Date.now();
	const existing = dedupe.get(key);
	if (existing && existing > now) return true;

	if (dedupe.size >= DEDUPE_MAX) {
		for (const [k, expiry] of dedupe) if (expiry <= now) dedupe.delete(k);
		// If still over the cap (many live entries), drop the oldest insertions.
		if (dedupe.size >= DEDUPE_MAX) {
			let overflow = dedupe.size - DEDUPE_MAX + 1;
			for (const k of dedupe.keys()) {
				dedupe.delete(k);
				if (--overflow <= 0) break;
			}
		}
	}
	dedupe.set(key, despawnMs > now ? despawnMs : now + 60_000);
	return false;
}

/** Per-user hourly rate limit using config.maxPerUserPerHour. */
export function underRateLimit(userId: string): boolean {
	const limit = getServerConfig().push?.maxPerUserPerHour ?? 30;
	const now = Date.now();
	const state = rateState.get(userId);
	if (!state || now - state.windowStart >= 3_600_000) {
		rateState.set(userId, { windowStart: now, count: 1 });
		return true;
	}
	if (state.count >= limit) return false;
	state.count += 1;
	return true;
}

export type { Entry };
