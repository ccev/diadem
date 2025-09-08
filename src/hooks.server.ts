import type { Handle } from "@sveltejs/kit";
import {
	createSession,
	deleteSessionTokenCookie,
	invalidateSession,
	makeNewSession,
	sessionCookieName,
	setSessionTokenCookie,
	validateSessionToken
} from "@/lib/server/auth/auth";
import TTLCache from "@isaacs/ttlcache";
import { getEveryonePerms, type Perms, updatePermissions } from "@/lib/server/auth/permissions";
import type { User } from "@/lib/server/db/internal/schema";
import { getServerConfig, isAuthRequired } from "@/lib/services/config/config.server";
import { DISCORD_REFRESH_INTERVAL, PERMISSION_UPDATE_INTERVAL } from "@/lib/constants";
import { getDiscordAuth } from "@/lib/server/auth/discord";
import { building } from "$app/environment";
import type { ServerInit } from "@sveltejs/kit";

const permissionCache: TTLCache<string, undefined> = new TTLCache({
	ttl: PERMISSION_UPDATE_INTERVAL * 1000
});

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(sessionCookieName);

	event.locals.perms = await getEveryonePerms(event.fetch);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;

		if (isAuthRequired()) {
			if (event.url.pathname.startsWith("/login")) return resolve(event);

			return new Response(null, {
				status: 302,
				headers: {
					Location: "/login/discord"
				}
			});
		}

		return resolve(event);
	}

	const { session, user } = await validateSessionToken(sessionToken);

	if (session) {
		setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		deleteSessionTokenCookie(event);
	}

	if (user && !permissionCache.has(user.id)) {
		user.permissions = await updatePermissions(user as User, session.discordToken, event.fetch);
		permissionCache.set(user.id, undefined);
	}

	// Refresh Discord Auth if necessary
	const discord = getDiscordAuth();
	if (
		discord &&
		session &&
		session.discordLastRefresh < new Date(Date.now() - DISCORD_REFRESH_INTERVAL * 1000)
	) {
		console.log("Refreshing Discord auth token for user " + user.id);

		try {
			const tokens = await discord.refreshAccessToken(session.discordRefreshToken);
			await makeNewSession(
				event,
				user.id,
				tokens.accessToken(),
				tokens.refreshToken(),
				tokens.accessTokenExpiresAt()
			);
			await invalidateSession(session.id);
		} catch (e) {
			console.error("Error while refreshing discord token: " + e.toString());
			await invalidateSession(session.id);
			// TODO: handle this properly
		}
	}

	event.locals.user = user;
	event.locals.session = session;
	if (user) event.locals.perms = user.permissions as Perms;
	return resolve(event);
};

export const handle: Handle = handleAuth;
