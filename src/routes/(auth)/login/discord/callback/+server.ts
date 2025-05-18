import type { RequestEvent } from '@sveltejs/kit';
import type { OAuth2Tokens } from 'arctic';
import {
	createSession, createUserFromDiscordId,
	generateSessionToken,
	getUserFromDiscordId, makeNewSession,
	setSessionTokenCookie
} from '@/lib/server/auth/auth';
import { getDiscordAuth } from '@/lib/server/auth/discord';
import { getUserInfo } from '@/lib/server/auth/discordDetails';

export async function GET(event: RequestEvent): Promise<Response> {
	const discord = getDiscordAuth();
	if (!discord) return new Response(null, { status: 404 });

	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const storedState = event.cookies.get('discord_state') ?? null;
	const codeVerifier = event.cookies.get('discord_code_verifier') ?? null;
	const redirect = event.cookies.get('login_redirect') ?? "/";
	if (code === null || state === null || storedState === null || codeVerifier === null) {
		console.warn("Discord Login: No Code or state found")
		return new Response(null, {
			status: 400
		});
	}
	if (state !== storedState) {
		console.warn("Discord Login: State didn't match")
		return new Response(null, {
			status: 400
		});
	}

	let tokens: OAuth2Tokens;
	try {
		tokens = await discord.validateAuthorizationCode(code, codeVerifier);
	} catch (e) {
		console.warn("Discord Login: Invalid code, credentials or redirect URI")
		return new Response(null, {
			status: 400
		});
	}

	const userInfo = await getUserInfo(tokens.accessToken())

	if (!userInfo.id) {
		console.warn("Discord Login: Discord didn't return user info")
		return new Response(null, {
			status: 400
		});
	}

	const existingUser = await getUserFromDiscordId(userInfo.id);

	let userId: string
	if (existingUser) {
		userId = existingUser.id
	} else {
		userId = await createUserFromDiscordId(userInfo.id)
	}

	await makeNewSession(event, userId, tokens.accessToken())

	return new Response(null, {
		status: 302,
		headers: {
			Location: redirect
		}
	});

}
