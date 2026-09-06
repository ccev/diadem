import { respond } from "@/lib/server/api/respond";
import { getUserInfoResult, isGuildMember } from "@/lib/server/auth/discordDetails";
import type { UserData } from "@/lib/services/user/userDetails.svelte";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getEveryonePerms } from "@/lib/server/auth/permissions";
import { getDiscordAccessToken, signOut } from "@/lib/server/auth/betterAuth";
import { getServerLogger } from "@/lib/server/logging";
import { removeRedundantPermissionAreas } from "@/lib/utils/features";
import type { RequestHandler } from "./$types";

const log = getServerLogger("auth");

export const GET: RequestHandler = async (event) => {
	const user = event.locals.user;

	if (!user) {
		return respond(event.request, {
			permissions: removeRedundantPermissionAreas(await getEveryonePerms(event.fetch))
		} as UserData);
	}

	const accessToken = await getDiscordAccessToken(event);
	if (!accessToken) {
		return respond(event.request, {
			permissions: removeRedundantPermissionAreas(event.locals.perms)
		} as UserData);
	}

	const [userInfoResult, isMember] = await Promise.all([
		getUserInfoResult(accessToken),
		isGuildMember(getClientConfig().discord.serverId, accessToken).catch((error) => {
			log.warning(`Error checking Discord guild membership: ${error}`);
			return undefined;
		})
	]);
	const data = userInfoResult.data;

	if (!data) {
		if (userInfoResult.status === 401) {
			await signOut(event);
			return respond(event.request, {
				permissions: removeRedundantPermissionAreas(await getEveryonePerms(event.fetch))
			} as UserData);
		}

		return respond(event.request, {
			permissions: removeRedundantPermissionAreas(event.locals.perms)
		} as UserData);
	}

	return respond(event.request, {
		details: data,
		permissions: removeRedundantPermissionAreas(event.locals.perms),
		isGuildMember: isMember
	} as UserData);
};
