import { json } from "@sveltejs/kit";
import { getUserInfoResult, isGuildMember } from "@/lib/server/auth/discordDetails";
import type { UserData } from "@/lib/services/user/userDetails.svelte";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getEveryonePerms } from "@/lib/server/auth/permissions";
import { getDiscordAccessToken, signOut } from "@/lib/server/auth/betterAuth";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	const user = event.locals.user;

	if (!user) {
		return json({
			permissions: await getEveryonePerms(event.fetch)
		} as UserData);
	}

	const accessToken = await getDiscordAccessToken(event);
	if (!accessToken) {
		return json({
			permissions: user.permissions
		} as UserData);
	}

	const userInfoResult = await getUserInfoResult(accessToken);
	const data = userInfoResult.data;

	if (!data) {
		if (userInfoResult.status === 401) {
			await signOut(event);
			return json({
				permissions: await getEveryonePerms(event.fetch)
			} as UserData);
		}

		return json({
			permissions: user.permissions
		} as UserData);
	}

	let isMember: boolean | undefined;
	try {
		isMember = await isGuildMember(getClientConfig().discord.serverId, accessToken);
	} catch (error) {
		console.error("Error while checking Discord guild membership: " + error?.toString?.());
	}

	return json({
		details: data,
		permissions: user.permissions,
		isGuildMember: isMember
	} as UserData);
};
