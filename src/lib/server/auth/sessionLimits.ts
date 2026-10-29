import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { type DiscordGuildData, getGuildMemberInfo } from "@/lib/server/auth/discordDetails";
import { db } from "@/lib/server/db/internal";
import { session, user } from "@/lib/server/db/internal/schema";
import { getServerConfig } from "@/lib/services/config/config.server";
import type { AuthSessions } from "@/lib/services/config/configTypes";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("sessions");

/** Highest of the matched limits, where 0 (unlimited) beats everything */
function highestLimit(limits: { maxPerUser: number }[]) {
	if (limits.some((limit) => limit.maxPerUser === 0)) return 0;
	return Math.max(...limits.map((limit) => limit.maxPerUser));
}

/**
 * The user's session limit (0 = unlimited). The most specific match wins: a user limit
 * applies regardless of roles or guilds, then role limits, then guild limits, then the default.
 * Discord is only asked for guild data when no user limit matched.
 */
export async function resolveSessionLimit(
	config: AuthSessions,
	discordId: string,
	getGuild: (guildId: string) => Promise<DiscordGuildData | undefined>
): Promise<number> {
	const users = (config.users ?? []).filter((limit) => limit.userIds.includes(discordId));
	if (users.length) return highestLimit(users);

	const roles = [];
	for (const limit of config.roles ?? []) {
		if ((await getGuild(limit.guildId))?.roles?.includes(limit.roleId)) roles.push(limit);
	}
	if (roles.length) return highestLimit(roles);

	const guilds = [];
	for (const limit of config.guilds ?? []) {
		if ((await getGuild(limit.guildId))?.user) guilds.push(limit);
	}
	if (guilds.length) return highestLimit(guilds);

	return config.maxPerUser ?? 0;
}

/** Sessions to close so at most `limit` remain. The current one is always kept. */
export function getSessionsToClose(
	sessionIdsNewestFirst: string[],
	currentSessionId: string,
	limit: number
): string[] {
	if (limit <= 0) return [];
	const others = sessionIdsNewestFirst.filter((id) => id !== currentSessionId);
	return others.slice(limit - 1);
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
	if (!config) return;

	const [sessionUser] = await db
		.select({ discordId: user.discordId })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	if (!sessionUser) return;

	let accessToken: Promise<string | null> | undefined;
	const guildCache = new Map<string, DiscordGuildData | undefined>();
	const limit = await resolveSessionLimit(config, sessionUser.discordId, async (guildId) => {
		if (!guildCache.has(guildId)) {
			accessToken ??= getAccessToken();
			const token = await accessToken;
			const guild = token ? await getGuildMemberInfo(guildId, token) : undefined;
			if (!guild) log.warning(`discord guild lookup failed for user ${userId} in ${guildId}`);
			guildCache.set(guildId, guild);
		}
		return guildCache.get(guildId);
	});
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
