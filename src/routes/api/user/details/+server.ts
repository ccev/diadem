import { respond } from "@/lib/server/api/respond";
import { getUserInfoResult, isGuildMember } from "@/lib/server/auth/discordDetails";
import type { UserData } from "@/lib/services/user/userDetails.svelte";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getDiscordAccessToken } from "@/lib/server/auth/betterAuth";
import { getLinkedIdentities } from "@/lib/server/auth/auth";
import { removeRedundantPermissionAreas } from "@/lib/utils/features";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	const user = event.locals.user;
	const data: UserData = { permissions: removeRedundantPermissionAreas(event.locals.perms) };
	if (!user) return respond(event.request, data);
	const identities = await getLinkedIdentities(user.id);
	data.linkedProviders = identities.map((identity) => identity.providerId);
	data.details = { id: user.id, username: "", displayName: user.name, avatarUrl: user.image ?? "" };
	// A failed Discord lookup must not hide a valid Telegram (or linked) session.
	if (data.linkedProviders.includes("discord")) {
		const accessToken = await getDiscordAccessToken(event);
		if (accessToken) {
			const [profile, membership] = await Promise.all([
				getUserInfoResult(accessToken).catch(() => undefined),
				isGuildMember(getClientConfig().discord.serverId, accessToken).catch(() => undefined)
			]);
			if (profile?.data) data.details = profile.data;
			data.isGuildMember = membership;
		}
	}
	return respond(event.request, data);
};
