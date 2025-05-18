import { generateCodeVerifier, generateState } from 'arctic';
import { getDiscordAuth } from '@/lib/server/auth/discord';

import type { RequestEvent } from '@sveltejs/kit';
import { deleteSessionTokenCookie, invalidateSession } from '@/lib/server/auth/auth';

const SCOPES = ['identify', 'guilds.members.read'];

export async function GET(event: RequestEvent): Promise<Response> {
	const discord = getDiscordAuth();
	if (!discord) return new Response(null, { status: 404 });

	if (!event.locals.session) new Response(null, { status: 401 });

	await invalidateSession(event.locals.session.id)
	deleteSessionTokenCookie(event)
	await discord.revokeToken(event.locals.session.discordToken)
	return new Response()
}
