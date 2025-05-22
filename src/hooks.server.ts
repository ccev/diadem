import type { Handle } from '@sveltejs/kit';
import {
	createSession,
	deleteSessionTokenCookie, makeNewSession,
	sessionCookieName,
	setSessionTokenCookie,
	validateSessionToken
} from '@/lib/server/auth/auth';
import TTLCache from '@isaacs/ttlcache';
import { getEveryonePerms, type Perms, updatePermissions } from '@/lib/server/auth/permissions';
import type { User } from '@/lib/server/auth/db/schema';
import { getServerConfig, isAuthRequired } from '@/lib/config/config.server';
import { DISCORD_REFRESH_INTERVAL } from '@/lib/constants';
import { getDiscordAuth } from '@/lib/server/auth/discord';

const permissionCache: TTLCache<string, undefined> = new TTLCache({ ttl: 5 * 60 * 1000 })

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(sessionCookieName);

	event.locals.perms = getEveryonePerms()

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;

		if (isAuthRequired()) {
			if (event.url.pathname.startsWith("/login")) return resolve(event)

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
		user.permissions = await updatePermissions(user as User, session.discordToken)
		permissionCache.set(user.id, undefined)
	}

	event.locals.user = user;
	event.locals.session = session;
	if (user) event.locals.perms = user.permissions as Perms
	return resolve(event);
};

export const handle: Handle = handleAuth;
