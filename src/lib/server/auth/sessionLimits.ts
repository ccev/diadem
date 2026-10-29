import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { makeRuleMatcher } from "@/lib/server/auth/permissions";
import { db } from "@/lib/server/db/internal";
import { session, user } from "@/lib/server/db/internal/schema";
import { getServerConfig } from "@/lib/services/config/config.server";
import type { RuleRequirements, SessionLimit } from "@/lib/services/config/configTypes";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("sessions");

/**
 * The highest limit among the default and every rule the user matches. 0 = unlimited.
 * Rules that can't raise the current limit are skipped, so they cost no Discord lookups.
 */
export async function resolveSessionLimit(
	defaultLimit: number | undefined,
	rules: SessionLimit[],
	ruleApplies: (rule: RuleRequirements) => Promise<boolean>
): Promise<number> {
	if (!defaultLimit || defaultLimit < 0) return 0;

	let limit = defaultLimit;
	for (const rule of rules) {
		if (rule.maxPerUser !== 0 && rule.maxPerUser <= limit) continue;
		if (!(await ruleApplies(rule))) continue;
		if (rule.maxPerUser === 0) return 0;
		limit = rule.maxPerUser;
	}
	return limit;
}

/** Sessions to close so at most `limit` remain. The current one is always kept. */
export function getSessionsToClose(
	sessionIdsNewestFirst: string[],
	currentSessionId: string,
	limit: number
): string[] {
	if (limit <= 0) return [];
	const others = sessionIdsNewestFirst.filter((id) => id !== currentSessionId);
	return others.slice(Math.max(limit - 1, 0));
}

/**
 * Closes the user's oldest active sessions once they have more than their configured limit
 * (`server.auth.sessions`). Called right after a session is created.
 */
export async function enforceSessionLimit(
	userId: string,
	currentSessionId: string,
	getAccessToken: () => Promise<string | null>
) {
	const config = getServerConfig().auth.sessions;
	if (!config?.maxPerUser) return;

	const [sessionUser] = await db
		.select({ id: user.id, discordId: user.discordId })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	if (!sessionUser) return;

	const rules = config.limits ?? [];
	const accessToken = rules.some((rule) => rule.guildId) ? ((await getAccessToken()) ?? "") : "";
	const limit = await resolveSessionLimit(
		config.maxPerUser,
		rules,
		makeRuleMatcher(sessionUser, accessToken)
	);
	if (!limit) return;

	const active = await db
		.select({ id: session.id })
		.from(session)
		.where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
		.orderBy(desc(session.createdAt));

	const toClose = getSessionsToClose(
		active.map((s) => s.id),
		currentSessionId,
		limit
	);
	if (!toClose.length) return;

	await db.delete(session).where(inArray(session.id, toClose));
	log.info(`Closed ${toClose.length} old session(s) of user ${userId} (limit: ${limit})`);
}
