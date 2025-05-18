import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCase, encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '@/lib/server/auth/db';
import * as table from '@/lib/server/auth/db/schema';
import type { Perms } from '@/lib/server/auth/permissions';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export async function getUserFromDiscordId(discordId: string) {
	const [result] = await db
		.select({ user: { id: table.user.id } })
		.from(table.user)
		.where(eq(table.user.discordId, discordId));

	if (!result) return;

	return result.user;
}

export async function createUserFromDiscordId(discordId: string) {
	const userId = generateUserId();
	const defaultPerms: Perms = { areas: [], features: [] };
	const r = await db
		.insert(table.user)
		.values({ id: userId, discordId, permissions: JSON.stringify(defaultPerms) });
	return userId;
}

export async function makeNewSession(event: RequestEvent, userId: string, accessToken: string) {
	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, userId, accessToken);
	setSessionTokenCookie(event, sessionToken, session.expiresAt);
}

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	return encodeBase64url(bytes);
}

export async function createSession(token: string, userId: string, accessToken: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: table.Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30),
		discordToken: accessToken
	};
	await db.insert(table.session).values(session);
	return session;
}

function generateUserId() {
	// ID with 120 bits of entropy, or about the same as UUID v4.
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	return encodeBase32LowerCase(bytes);
}

export async function setPermissions(userId: string, permissions: Perms) {
	const u = await db
		.update(table.user)
		.set({ permissions: permissions })
		.where(eq(table.user.id, userId));
}

export async function validateSessionToken(token: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [result] = await db
		.select({
			user: {
				id: table.user.id,
				permissions: table.user.permissions,
				discordId: table.user.discordId,
				discordToken: table.session.discordToken
			},
			session: table.session
		})
		.from(table.session)
		.innerJoin(table.user, eq(table.session.userId, table.user.id))
		.where(eq(table.session.id, sessionId));

	if (!result) {
		return { session: null, user: null };
	}
	const { session, user } = result;

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(table.session).where(eq(table.session.id, session.id));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		// TODO: renew session
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(table.session)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.session.id, session.id));
	}

	if (user) {
		user.permissions = JSON.parse((user.permissions as string) ?? '[]');
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string) {
	await db.delete(table.session).where(eq(table.session.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		path: '/'
	});
}
