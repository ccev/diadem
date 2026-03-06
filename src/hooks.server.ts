import type { Handle } from "@sveltejs/kit";
import { getOrCreateUserFromDiscordId } from "@/lib/server/auth/auth";
import {
	assertBetterAuthStartupReadiness,
	getAuthSession,
	getDiscordAccessToken,
	isAuthFeatureEnabled
} from "@/lib/server/auth/betterAuth";
import TTLCache from "@isaacs/ttlcache";
import {
	getEveryonePerms,
	type PermissionUser,
	updatePermissions
} from "@/lib/server/auth/permissions";
import { PERMISSION_UPDATE_INTERVAL } from "@/lib/constants";
import type { Perms } from "@/lib/utils/features";
import { getServerLogger } from "@/lib/server/logging";
import { setServerLoggerFactory } from "@/lib/utils/logger";
import { paraglideMiddleware } from "@/lib/paraglide/server";
import { sequence } from "@sveltejs/kit/hooks";

await assertBetterAuthStartupReadiness();

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(
		event.request,
		({ request: localizedRequest, locale }: { request: Request; locale: string }) => {
			event.request = localizedRequest;
			return resolve(event, {
				transformPageChunk: ({ html }) => html.replace("%lang%", locale)
			});
		}
	);

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

const permissionCache: TTLCache<string, undefined> = new TTLCache({
	ttl: PERMISSION_UPDATE_INTERVAL * 1000
});
const authLogger = getServerLogger("auth");
const permissionUpdateInFlight = new Map<string, Promise<Perms>>();

function updatePermissionsLocked(
	user: PermissionUser,
	accessToken: string,
	thisFetch: typeof fetch
) {
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
		user.permissions = await updatePermissionsLocked(user, accessToken || "", event.fetch);
		permissionCache.set(user.id, undefined);
	}

	event.locals.user = user;
	event.locals.session = authSession.session;
	event.locals.authUser = authSession.user;
	event.locals.perms = user.permissions;
	return resolve(event);
};

export const handle: Handle = sequence(paraglideHandle, handleAuth);
