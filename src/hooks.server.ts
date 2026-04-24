import type { Handle, ServerInit } from "@sveltejs/kit";
import { building } from "$app/environment";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { getOrCreateUserFromDiscordId } from "@/lib/server/auth/auth";
import {
	assertBetterAuthStartupReadiness,
	auth,
	getAuthSession,
	getDiscordAccessToken,
	isAuthFeatureEnabled
} from "@/lib/server/auth/betterAuth";
import TTLCache from "@isaacs/ttlcache";
import { getEveryonePerms, updatePermissions } from "@/lib/server/auth/permissions";
import type { User } from "@/lib/server/db/internal/schema";
import { PERMISSION_UPDATE_INTERVAL } from "@/lib/constants";
import type { Perms } from "@/lib/utils/features";
import { paraglideMiddleware } from "@/lib/paraglide/server";
import { sequence } from "@sveltejs/kit/hooks";
import { setServerLoggerFactory } from "@/lib/utils/logger";
import { getServerLogger } from "@/lib/server/logging";
import { getClientConfig } from "@/lib/services/config/config.server";
import { setConfig } from "@/lib/services/config/config";
import { getDisallowedPaths } from "@/lib/utils/disallowedPaths";
import { locales, serverAsyncLocalStorage } from "@/lib/paraglide/runtime";

process.title = "Diadem";

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;

		// set locale for ssr metadata
		const langParam = event.url.searchParams.get("lang");
		if (langParam && (locales as readonly string[]).includes(langParam)) {
			const store = serverAsyncLocalStorage?.getStore();
			if (store) store.locale = langParam as (typeof locales)[number];
		}
		const effectiveLocale = langParam ?? locale;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace("%lang%", effectiveLocale)
		});
	});

const permissionCache: TTLCache<string, undefined> = new TTLCache({
	ttl: PERMISSION_UPDATE_INTERVAL * 1000
});
const authLogger = getServerLogger("auth");
const permissionUpdateInFlight = new Map<string, Promise<Perms>>();

function updatePermissionsLocked(user: User, accessToken: string, thisFetch: typeof fetch) {
	let updatePromise = permissionUpdateInFlight.get(user.id);
	if (!updatePromise) {
		updatePromise = updatePermissions(user, accessToken, thisFetch).finally(() => {
			permissionUpdateInFlight.delete(user.id);
		});
		permissionUpdateInFlight.set(user.id, updatePromise);
	}
	return updatePromise;
}

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (!auth) return resolve(event);
	return svelteKitHandler({ event, resolve, auth, building });
};

const handleAuth: Handle = async ({ event, resolve }) => {
	event.locals.perms = await getEveryonePerms(event.fetch);
	event.locals.user = null;
	event.locals.session = null;
	event.locals.authUser = null;

	if (!isAuthFeatureEnabled()) {
		return resolve(event);
	}

	const authSession = await getAuthSession(event);
	if (!authSession?.session || !authSession.user) {
		return resolve(event);
	}

	const discordId = authSession.user.discordId;
	if (!discordId) {
		authLogger.warning("Authenticated user has no discordId in Better Auth session");
		return resolve(event);
	}

	const user = await getOrCreateUserFromDiscordId(discordId);
	if (!permissionCache.has(user.id)) {
		const accessToken = await getDiscordAccessToken(event);
		user.permissions = await updatePermissionsLocked(user, accessToken ?? "", event.fetch);
		permissionCache.set(user.id, undefined);
	}

	event.locals.user = user;
	event.locals.session = authSession.session;
	event.locals.authUser = authSession.user;
	event.locals.perms = user.permissions;
	return resolve(event);
};

export const init: ServerInit = async () => {
	// set config for ssr
	const config = getClientConfig();
	setConfig(config);

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

	await assertBetterAuthStartupReadiness();

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

			const isNonindexPath = getDisallowedPaths().some((p) => event.url.pathname.startsWith(p));
			if (!general.allowCrawlers) {
				addMeta('name="robots"', '<meta name="robots" content="noindex, nofollow">');
			} else if (isNonindexPath) {
				addMeta('name="robots"', '<meta name="robots" content="noindex, follow">');
			} else {
				addMeta('name="robots"', '<meta name="robots" content="index, follow">');
			}

			if (general.description) {
				addMeta('name="description"', `<meta name="description" content="${general.description}">`);
				addMeta(
					'property="og:description"',
					`<meta property="og:description" content="${general.description}">`
				);
			}
			if (general.image) {
				addMeta('property="og:image"', `<meta property="og:image" content="${general.image}">`);
				addMeta(
					'name="twitter:image:src"',
					`<meta name="twitter:image:src" content="${general.image}">`
				);
				addMeta('name="twitter:card"', '<meta name="twitter:card" content="summary_large_image">');
			}
			if (general.url) {
				addMeta('rel="canonical"', `<link rel="canonical" href="${general.url}">`);
				addMeta('property="og:url"', `<meta property="og:url" content="${general.url}">`);
				if (!general.image) {
					addMeta(
						'property="og:image"',
						`<meta property="og:image" content="${general.url}/thumbnail.png">`
					);
					addMeta(
						'name="twitter:image:src"',
						`<meta name="twitter:image:src" content="${general.url}/thumbnail.png">`
					);
					addMeta(
						'name="twitter:card"',
						'<meta name="twitter:card" content="summary_large_image">'
					);
				}
			}

			addMeta('property="og:title"', `<meta property="og:title" content="${general.mapName}">`);
			addMeta('name="twitter:title"', `<meta name="twitter:title" content="${general.mapName}">`);
			addMeta(
				'property="og:site_name"',
				`<meta property="og:site_name" content="${general.mapName}">`
			);
			addMeta('name="twitter:site"', `<meta name="twitter:site" content="${general.mapName}">`);
			if (general.description) {
				addMeta(
					'name="twitter:description"',
					`<meta name="twitter:description" content="${general.description}">`
				);
			}
			addMeta('property="og:type"', '<meta property="og:type" content="website">');

			if (metaTags.length === 0) return html;
			return html.replace("</head>", metaTags.join("\n") + "\n</head>");
		}
	});
};

export const handle: Handle = sequence(paraglideHandle, handleBetterAuth, handleAuth, handleSeo);
