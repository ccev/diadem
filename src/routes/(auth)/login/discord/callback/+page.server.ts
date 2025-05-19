import type { PageServerLoad } from './$types';
import { getDiscordAuth } from '@/lib/server/auth/discord';
import type { OAuth2Tokens } from 'arctic';
import { getUserInfo } from '@/lib/server/auth/discordDetails';
import { createUserFromDiscordId, getUserFromDiscordId, makeNewSession } from '@/lib/server/auth/auth';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const discord = getDiscordAuth();
	if (!discord) return new Response(null, { status: 404 });

	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const storedState = event.cookies.get('discord_state') ?? null;
	const codeVerifier = event.cookies.get('discord_code_verifier') ?? null;
	const redirectLink = event.cookies.get('login_redirect') ?? "/";

	const respone: { error: string | undefined, redir: string, name: string } = {
		error: undefined,
		redir: redirectLink,
		name: ""
	}

	if (code === null || state === null || storedState === null || codeVerifier === null) {
		respone.error = "Discord Login: No Code or state found"
		return respone
	}
	if (state !== storedState) {
		respone.error = "Discord Login: State didn't match"
		return respone
	}

	let tokens: OAuth2Tokens;
	try {
		tokens = await discord.validateAuthorizationCode(code, codeVerifier);
	} catch (e) {
		respone.error = "Discord Login: Invalid code, credentials or redirect URI"
		return respone
	}

	const userInfo = await getUserInfo(tokens.accessToken())

	if (!userInfo.id) {
		respone.error = "Discord Login: Discord didn't return user info"
		return respone
	}

	const existingUser = await getUserFromDiscordId(userInfo.id);

	let userId: string
	if (existingUser) {
		userId = existingUser.id
	} else {
		userId = await createUserFromDiscordId(userInfo.id)
	}

	await makeNewSession(event, userId, tokens.accessToken())

	respone.name = userInfo.displayName
	return respone
};