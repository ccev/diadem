import { db } from "@/lib/server/db/internal";
import * as table from "@/lib/server/db/internal/schema";
import { isMysqlError } from "@/lib/server/db/internal/errorCodes";
import { encodeBase32LowerCase } from "@oslojs/encoding";
import { eq } from "drizzle-orm";

import type { User } from "@/lib/server/db/internal/schema";
import type { Perms } from "@/lib/utils/features";

function getDefaultPerms(): Perms {
	return { everywhere: [], areas: [] };
}

export function generateUserId() {
	// ID with 120 bits of entropy, or about the same as UUID v4.
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	return encodeBase32LowerCase(bytes);
}

function isDuplicateUserError(error: unknown) {
	return isMysqlError(error, "ER_DUP_ENTRY", 1062);
}

export async function getUserFromDiscordId(discordId: string) {
	const [result] = await db.select().from(table.user).where(eq(table.user.discordId, discordId));

	if (!result) return null;

	return { ...result, permissions: getDefaultPerms() } as User;
}

export async function createUserFromDiscordId(discordId: string) {
	const userId = generateUserId();
	const now = new Date();
	await db.insert(table.user).values({
		id: userId,
		name: `discord-${discordId}`,
		email: `${discordId}@discord.internal`,
		emailVerified: true,
		discordId,
		userSettings: {},
		createdAt: now,
		updatedAt: now
	});
	return userId;
}

export async function getOrCreateUserFromDiscordId(discordId: string) {
	let user = await getUserFromDiscordId(discordId);
	if (user) return user;

	try {
		await createUserFromDiscordId(discordId);
	} catch (error) {
		if (!isDuplicateUserError(error)) {
			throw error;
		}
	}

	user = await getUserFromDiscordId(discordId);
	if (!user) {
		throw new Error(`failed to create user for Discord id ${discordId}`);
	}
	return user;
}

export function sanitizeRedirectPath(redirectPath: string | null | undefined, fallback: string) {
	if (!redirectPath) return fallback;
	if (!redirectPath.startsWith("/") || redirectPath.startsWith("//")) return fallback;
	return redirectPath;
}
