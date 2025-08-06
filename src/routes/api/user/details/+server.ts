import { json } from '@sveltejs/kit';
import { getUserInfo, isGuildMember } from '@/lib/server/auth/discordDetails';
import type { UserData } from '@/lib/user/userDetails.svelte';
import { DISCORD_REFRESH_INTERVAL } from '@/lib/constants';
import { deleteSessionTokenCookie, invalidateSession, makeNewSession } from '@/lib/server/auth/auth';
import { getDiscordAuth } from '@/lib/server/auth/discord';
import { getClientConfig, getServerConfig } from '@/lib/config/config.server';
import { getEveryonePerms } from '@/lib/server/auth/permissions';

export async function GET(event) {
	const user = event.locals.user
	const session = event.locals.session

	if (!user) return json({
		permissions: await getEveryonePerms(event.fetch),
	} as UserData);

	const data = await getUserInfo(session.discordToken);
	
	if (!data) {
		await invalidateSession(event.locals.session.id)
		deleteSessionTokenCookie(event)
		return json({
			permissions: await getEveryonePerms(event.fetch),
		} as UserData);
	}

	const isMember = await isGuildMember(getClientConfig().discord.serverId, session.discordToken)

	return json({
		details: data,
		permissions: user.permissions,
		isGuildMember: isMember
	} as UserData);
}
