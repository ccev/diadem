import { eq } from "drizzle-orm";
import { encodeBase32LowerCase } from "@oslojs/encoding";
import { db } from "@/lib/server/db/internal";
import * as table from "@/lib/server/db/internal/schema";

import type { User } from "@/lib/server/db/internal/schema";
import type { Perms } from "@/lib/utils/features";

function getDefaultPerms(): Perms {
	return { everywhere: [], areas: [] };
}

function parsePermissions(rawPermissions: unknown): Perms {
	try {
		const parsed = typeof rawPermissions === "string" ? JSON.parse(rawPermissions) : rawPermissions;
		if (!parsed || typeof parsed !== "object") {
			return getDefaultPerms();
		}

		const perms = parsed as Partial<Perms>;
		return {
			everywhere: Array.isArray(perms.everywhere) ? perms.everywhere : [],
			areas: Array.isArray(perms.areas) ? perms.areas : []
		};
	} catch {
		return getDefaultPerms();
	}
}

function generateUserId() {
	// ID with 120 bits of entropy, or about the same as UUID v4.
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	return encodeBase32LowerCase(bytes);
}

function coerceUser(result: typeof table.user.$inferSelect): User {
	return {
		...result,
		permissions: parsePermissions(result.permissions)
	};
}

function isDuplicateUserError(error: unknown) {
	if (!error || typeof error !== "object") return false;

	const mysqlError = error as { code?: string; errno?: number };
	return mysqlError.code === "ER_DUP_ENTRY" || mysqlError.errno === 1062;
}

export async function getUserFromDiscordId(discordId: string) {
	const [result] = await db.select().from(table.user).where(eq(table.user.discordId, discordId));

	if (!result) return null;

	return coerceUser(result);
}

export async function createUserFromDiscordId(discordId: string) {
	const userId = generateUserId();
	const now = new Date();
	await db
		.insert(table.user)
		.values({
			id: userId,
			name: `discord-${discordId}`,
			email: `${discordId}@discord.diadem.local`,
			emailVerified: true,
			discordId,
			permissions: getDefaultPerms(),
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

export async function setPermissions(userId: string, permissions: Perms) {
	await db.update(table.user).set({ permissions }).where(eq(table.user.id, userId));
}
