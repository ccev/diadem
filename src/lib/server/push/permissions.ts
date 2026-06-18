import { updatePermissions } from "@/lib/server/auth/permissions";
import type { User } from "@/lib/server/db/internal/schema";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { Features } from "@/lib/utils/features";

const WATCHED_FEATURES = [
	Features.POKEMON,
	Features.POKEMON_IV,
	Features.RAID,
	Features.QUEST,
	Features.INVASION,
	Features.MAX_BATTLE
];
const CONTEXT_TTL_MS = 300_000;

let cached: { context: FeaturePermissionContext; expiresAt: number } | null = null;
let inFlight: Promise<FeaturePermissionContext> | null = null;

/**
 * Shared permission context for push matching.
 *
 * Push runs with no live request, so we cannot obtain a fresh Discord access
 * token to evaluate guild/role-gated rules. We therefore evaluate only the
 * `everyone` + `loggedIn` permission rules (passing an empty token makes
 * updatePermissions skip guild lookups). These rules are identical for every
 * logged-in subscriber, so a single context is shared across all users and
 * cached briefly.
 *
 * Consequence: push respects public and logged-in area grants. Role-gated
 * (Discord guild/role) area grants are NOT evaluated for push in this version —
 * affected users simply receive no alert there (safe, deny-by-default).
 * Instances that grant pokemon to `everyone` (the default) are unaffected.
 */
export async function getSharedPushContext(): Promise<FeaturePermissionContext> {
	if (cached && cached.expiresAt > Date.now()) return cached.context;
	if (inFlight) return inFlight;

	inFlight = (async () => {
		// Dummy user: with an empty token, updatePermissions skips guild lookups,
		// and the user object's id would only be used in a log line that cannot run.
		const dummyUser = { id: "__push__" } as User;
		const perms = await updatePermissions(dummyUser, "", fetch);
		const context = new FeaturePermissionContext(perms, WATCHED_FEATURES);
		cached = { context, expiresAt: Date.now() + CONTEXT_TTL_MS };
		return context;
	})().finally(() => {
		inFlight = null;
	});

	return inFlight;
}
