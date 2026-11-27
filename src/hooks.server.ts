import { redirect, type Handle, type ServerInit } from "@sveltejs/kit";

import { getUserByDiscordId } from "@/lib/server/auth/auth";
import {
	AUTH_BASE_PATH,
	auth,
	getAuthSession,
	getDiscordAccessToken,
	isAuthEnabled
} from "@/lib/server/auth/betterAuth";
import { TTLCache } from "@isaacs/ttlcache";
import { getEveryonePerms, updatePermissions } from "@/lib/server/auth/permissions";
import type { User } from "@/lib/server/db/internal/schema";
import { PERMISSION_UPDATE_INTERVAL } from "@/lib/constants";
import type { Perms } from "@/lib/utils/features";
import { baseLocale, getServerAsyncLocalStorage, locales } from "@/lib/paraglide/runtime";
import { paraglideMiddleware } from "@/lib/paraglide/server";
import { sequence } from "@sveltejs/kit/hooks";
import { setServerLoggerFactory } from "@/lib/utils/logger";
import { getServerLogger } from "@/lib/server/logging";
import { getClientConfig } from "@/lib/services/config/config.server";
import { setConfig } from "@/lib/services/config/config";
import { getDisallowedPaths, isDisallowedPath } from "@/lib/utils/disallowedPaths";
import {
	getLegacyShareRedirect,
	getSeoOrigin,
	localizePath,
	splitLocalePath
} from "@/lib/utils/localePaths";

process.title = "Diadem";

function isSeoRoute(routeId: string | null) {
	return routeId?.startsWith("/(main)/") || routeId?.startsWith("/(share)/");
}

const handleLegacyShareLinks: Handle = ({ event, resolve }) => {
	if (isSeoRoute(event.route.id) && !event.isRemoteRequest) {
		const target = getLegacyShareRedirect(event.url);
		if (target) redirect(308, target.href);
	}
	return resolve(event);
};

const handleLocale: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ locale }) => {
		const seoLocale = isSeoRoute(event.route.id)
			? (splitLocalePath(event.url.pathname).locale ?? baseLocale)
			: undefined;
		const render = () =>
			resolve(event, {
				transformPageChunk: ({ html }) => html.replace("%lang%", seoLocale ?? locale)
			});

		// Only the server-rendered share pages and thumbnails translate content using the URL.
		// Use a nested request context, never set the UI preference or mutate the parent store.
		const storage = getServerAsyncLocalStorage();
		const context = storage?.getStore();
		if (seoLocale && storage && context && event.route.id?.startsWith("/(share)/")) {
			return storage.run({ ...context, locale: seoLocale }, render);
		}
		return render();
	});

const permissionCache: TTLCache<string, Perms> = new TTLCache({
	ttl: PERMISSION_UPDATE_INTERVAL * 1000
});
const authLog = getServerLogger("auth");
const permissionUpdateInFlight = new Map<string, Promise<Perms>>();

const publicRoutePrefixes = ["/api/locale/", "/assets/"];
const publicRoutes = new Set([
	"/api/config",
	"/api/pogodata",
	"/api/koji",
	"/api/stats",
	"/robots.txt",
	"/sitemap.xml"
]);

function isPublicRoute(pathname: string) {
	return (
		publicRoutes.has(pathname) || publicRoutePrefixes.some((prefix) => pathname.startsWith(prefix))
	);
}

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

const handleAuth: Handle = async ({ event, resolve }) => {
	if (process.env.BUILD_TARGET === "native") {
		event.locals.perms = { everywhere: [], areas: [] };
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	if (auth && event.url.pathname.startsWith(`${AUTH_BASE_PATH}/`)) {
		return auth.handler(event.request);
	}

	// These endpoints never use request-specific permissions. Avoid a session, database,
	// and Koji lookup so they remain safe and useful CDN cache candidates.
	if (isPublicRoute(event.url.pathname)) {
		event.locals.perms = { everywhere: [], areas: [] };
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	event.locals.perms = await getEveryonePerms(event.fetch);
	event.locals.user = null;
	event.locals.session = null;

	if (!isAuthEnabled()) {
		return resolve(event);
	}

	const authSession = await getAuthSession(event);
	if (!authSession?.session || !authSession.user) {
		return resolve(event);
	}

	const discordId = authSession.user.discordId;
	if (!discordId) {
		authLog.warning("Authenticated user has no discordId in Better Auth session");
		return resolve(event);
	}

	const user = await getUserByDiscordId(discordId);
	if (!user) {
		authLog.warning(`No user row found for Discord id ${discordId}`);
		return resolve(event);
	}

	let perms = permissionCache.get(user.id);
	if (!perms) {
		const accessToken = await getDiscordAccessToken(event);
		try {
			perms = await updatePermissionsLocked(user, accessToken ?? "", event.fetch);
			permissionCache.set(user.id, perms);
		} catch (error) {
			authLog.warning(`Failed to update permissions for user ${user.id}: ${error}`);
			perms = event.locals.perms;
		}
	}

	event.locals.user = user;
	event.locals.session = authSession.session;
	event.locals.perms = perms;
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

	if (process.env.BUILD_TARGET === "native") return;

	const { initDiadem } = await import("@/lib/server/init");
	await initDiadem();
};

const handleSeo: Handle = async ({ event, resolve }) => {
	return resolve(event, {
		transformPageChunk: ({ html }) => {
			if (!html.includes("</head>")) return html;
			const general = getClientConfig().general;
			const isPublicPage = isSeoRoute(event.route.id);
			const pathname = event.url.pathname;
			const { path, locale: seoLocale } = splitLocalePath(pathname);
			const canonicalPath = isPublicPage ? localizePath(path, seoLocale ?? baseLocale) : pathname;
			const disallowedPaths = getDisallowedPaths(general.disallowedPaths);
			const isNonindexPath =
				isDisallowedPath(canonicalPath, disallowedPaths) ||
				(canonicalPath !== pathname && isDisallowedPath(pathname, disallowedPaths));
			const origin = getSeoOrigin(general.url, event.url.origin);
			const metaTags: string[] = [];

			const addMeta = (identifier: string, tag: string) => {
				if (!html.includes(identifier)) metaTags.push(tag);
			};

			if (!general.allowCrawlers) {
				addMeta('name="robots"', '<meta name="robots" content="noindex, nofollow">');
			} else if (isNonindexPath) {
				addMeta('name="robots"', '<meta name="robots" content="noindex, follow">');
			} else {
				addMeta('name="robots"', '<meta name="robots" content="index, follow">');
			}

			const description = escapeHtml(general.description ?? "");
			if (description) {
				addMeta('name="description"', `<meta name="description" content="${description}">`);
				addMeta(
					'property="og:description"',
					`<meta property="og:description" content="${description}">`
				);
				addMeta(
					'name="twitter:description"',
					`<meta name="twitter:description" content="${description}">`
				);
			}
			if (isPublicPage) {
				const canonical = escapeHtml(new URL(canonicalPath, origin).href);
				addMeta('rel="canonical"', `<link rel="canonical" href="${canonical}">`);
				addMeta('property="og:url"', `<meta property="og:url" content="${canonical}">`);

				if (general.allowCrawlers && !isNonindexPath) {
					for (const locale of locales) {
						const alternatePath = localizePath(path, locale);
						if (isDisallowedPath(alternatePath, disallowedPaths)) continue;
						const href = escapeHtml(new URL(alternatePath, origin).href);
						metaTags.push(`<link rel="alternate" hreflang="${locale}" href="${href}">`);
						if (locale === baseLocale) {
							metaTags.push(`<link rel="alternate" hreflang="x-default" href="${href}">`);
						}
					}
				}
			}
			if (general.image || isPublicPage) {
				const image = escapeHtml(general.image || new URL("/thumbnail.png", origin).href);
				addMeta('property="og:image"', `<meta property="og:image" content="${image}">`);
				addMeta('name="twitter:image:src"', `<meta name="twitter:image:src" content="${image}">`);
				addMeta('name="twitter:card"', '<meta name="twitter:card" content="summary_large_image">');
			}

			const mapName = escapeHtml(general.mapName);
			if (!/<title(?:\s|>)/.test(html)) metaTags.push(`<title>${mapName}</title>`);
			addMeta('property="og:title"', `<meta property="og:title" content="${mapName}">`);
			addMeta('name="twitter:title"', `<meta name="twitter:title" content="${mapName}">`);
			addMeta('property="og:site_name"', `<meta property="og:site_name" content="${mapName}">`);
			addMeta('name="twitter:site"', `<meta name="twitter:site" content="${mapName}">`);
			addMeta('property="og:type"', '<meta property="og:type" content="website">');

			if (metaTags.length === 0) return html;
			return html.replace("</head>", metaTags.join("\n") + "\n</head>");
		}
	});
};

function escapeHtml(value: string): string {
	return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

export const handle: Handle = sequence(handleLegacyShareLinks, handleAuth, handleLocale, handleSeo);
