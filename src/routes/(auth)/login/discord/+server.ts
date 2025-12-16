import { generateCodeVerifier, generateState } from 'arctic';
import { getDiscordAuth } from '@/lib/server/auth/discord';

import type { RequestEvent } from '@sveltejs/kit';
import { getClientConfig, isAuthRequired } from "@/lib/services/config/config.server";

const SCOPES = ['identify', 'guilds.members.read'];

export async function GET(event: RequestEvent): Promise<Response> {
	const discord = getDiscordAuth();
	if (!discord) return new Response(null, { status: 404 });

	const state = generateState();
	const verifier = generateCodeVerifier();
	const url = discord.createAuthorizationURL(state, verifier, SCOPES);

	event.cookies.set('discord_state', state, {
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	event.cookies.set('discord_code_verifier', verifier, {
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	const mapPath = getClientConfig().general.customHome ? "/map" : "/";
	const redirect = isAuthRequired() ? "/" : mapPath;

	event.cookies.set('login_redirect', event.url.searchParams.get("redir") ?? redirect, {
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	return new Response(null, {
		status: 302,
		headers: {
			Location: url.toString()
		}
	});
}