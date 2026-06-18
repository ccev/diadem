import { updatePermissions } from "@/lib/server/auth/permissions";
import type { User } from "@/lib/server/db/internal/schema";
import { getDiscordAccessTokenForUser } from "@/lib/server/db/internal/repository";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { Features } from "@/lib/utils/features";

const WATCHED_FEATURES = [Features.POKEMON, Features.POKEMON_IV];

/**
 * Build a permission context for a user with no live request. Uses the stored
 * Discord access token; if it is missing/expired, updatePermissions() skips
 * guild rules (canCheckGuildRules === false) and the user falls back to the
 * everyone + loggedIn baseline — the safe default.
 */
export async function buildContextForUser(user: User): Promise<FeaturePermissionContext> {
	const accessToken = await getDiscordAccessTokenForUser(user.id);
	const perms = await updatePermissions(user, accessToken, fetch);
	return new FeaturePermissionContext(perms, WATCHED_FEATURES);
}
