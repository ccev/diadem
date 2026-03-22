import type { Handle, ServerInit } from "@sveltejs/kit";
import {
	deleteSessionTokenCookie,
	invalidateSession,
	makeNewSession,
	sessionCookieName,
	setSessionTokenCookie,
	validateSessionToken
} from "@/lib/server/auth/auth";
import TTLCache from "@isaacs/ttlcache";
import { getEveryonePerms, updatePermissions } from "@/lib/server/auth/permissions";
import type { User } from "@/lib/server/db/internal/schema";
import { DISCORD_REFRESH_INTERVAL, PERMISSION_UPDATE_INTERVAL } from "@/lib/constants";
import { getDiscordAuth } from "@/lib/server/auth/discord";
import type { Perms } from "@/lib/utils/features";
import { paraglideMiddleware } from "@/lib/paraglide/server";
import { sequence } from "@sveltejs/kit/hooks";
import { setServerLoggerFactory } from "@/lib/utils/logger";
import { getServerLogger } from "@/lib/server/logging";
import { getClientConfig, getServerConfig } from "@/lib/services/config/config.server";
import { setConfig } from "@/lib/services/config/config";
import { getDisallowedPaths } from "@/lib/utils/disallowedPaths";

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace("%lang%", locale)
		});
	});

const permissionCache: TTLCache<string, undefined> = new TTLCache({
	ttl: PERMISSION_UPDATE_INTERVAL * 1000
});

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(sessionCookieName);

	event.locals.perms = await getEveryonePerms(event.fetch);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;

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

export const init: ServerInit = async () => {
	// set config for ssr
	const config = getClientConfig()
	setConfig(config)

	setServerLoggerFactory((name) => {
		const winstonLogger = getServerLogger(name);
		return {
			debug: (message, ...args) => winstonLogger.debug(message, ...args),
			info: (message, ...args) => winstonLogger.info(message, ...args),
			warning: (message, ...args) => winstonLogger.warning(message, ...args),
			error: (message, ...args) => winstonLogger.error(message, ...args),
			crit: (message, ...args) => winstonLogger.crit(message, ...args)
		};
	});

	const { initDiadem } = await import("@/lib/server/init");
	await initDiadem();
};

const handleSeo: Handle = async ({ event, resolve }) => {
	const general = getClientConfig().general;

	return resolve(event, {
		transformPageChunk: ({ html }) => {
			const metaTags: string[] = [];

			const addMeta = (identifier: string, tag: string) => {
				if (!html.includes(identifier)) metaTags.push(tag);
			};

			const isNonindexPath = getDisallowedPaths().some((p) =>
				event.url.pathname.startsWith(p)
			);
			if (!general.allowCrawlers) {
				addMeta('name="robots"', '<meta name="robots" content="noindex, nofollow">');
			} else if (isNonindexPath) {
				addMeta('name="robots"', '<meta name="robots" content="noindex, follow">');
			} else {
				addMeta('name="robots"', '<meta name="robots" content="index, follow">');
			}

			if (general.description) {
				addMeta(
					'name="description"',
					`<meta name="description" content="${general.description}">`
				);
				addMeta(
					'property="og:description"',
					`<meta property="og:description" content="${general.description}">`
				);
			}
			if (general.image) {
				addMeta(
					'property="og:image"',
					`<meta property="og:image" content="${general.image}">`
				);
				addMeta(
					'name="twitter:image:src"',
					`<meta name="twitter:image:src" content="${general.image}">`
				);
				addMeta(
					'name="twitter:card"',
					'<meta name="twitter:card" content="summary_large_image">'
				);
			}
			if (general.url) {
				addMeta('rel="canonical"', `<link rel="canonical" href="${general.url}">`);
				addMeta(
					'property="og:url"',
					`<meta property="og:url" content="${general.url}">`
				);
			}

			addMeta(
				'property="og:site_name"',
				`<meta property="og:site_name" content="${general.mapName}">`
			);
			addMeta('property="og:type"', '<meta property="og:type" content="website">');

			if (metaTags.length === 0) return html;
			return html.replace('</head>', metaTags.join('\n') + '\n</head>');
		}
	});
};

export const handle: Handle = sequence(paraglideHandle, handleAuth, handleSeo);
