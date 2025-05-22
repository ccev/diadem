import { json } from '@sveltejs/kit';
import { getUserInfo } from '@/lib/server/auth/discordDetails';
import type { UserData } from '@/lib/user/userDetails.svelte';
import { DISCORD_REFRESH_INTERVAL } from '@/lib/constants';
import { invalidateSession, makeNewSession } from '@/lib/server/auth/auth';
import { getDiscordAuth } from '@/lib/server/auth/discord';

export async function GET(event) {
	const user = event.locals.user
	const session = event.locals.session
	if (!user) return json({});

	const data = await getUserInfo(session.discordToken);

	// Refresh Discord Auth if necessary
	const discord = getDiscordAuth()
	if (discord && session && session.discordLastRefresh < new Date(Date.now() - (DISCORD_REFRESH_INTERVAL * 1000))) {
		console.log("Refreshing Discord auth token for user " + user.id)
		const tokens = await discord.refreshAccessToken(session.discordRefreshToken)

		await makeNewSession(event, user.id, tokens.accessToken(), tokens.refreshToken(), tokens.accessTokenExpiresAt())
		await invalidateSession(session.id)
	}

	return json({
		details: data,
		permissions: user.permissions
	} as UserData);
}
