import { db } from "@/lib/server/db/internal";
import * as table from "@/lib/server/db/internal/schema";
import { encodeBase32LowerCase } from "@oslojs/encoding";
import { eq } from "drizzle-orm";

export function generateUserId() {
	// ID with 120 bits of entropy, or about the same as UUID v4.
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	return encodeBase32LowerCase(bytes);
}

export async function getUserByDiscordId(discordId: string) {
	const [result] = await db.select().from(table.user).where(eq(table.user.discordId, discordId));
	return result ?? null;
}

export async function getUserById(id: string) {
	const [row] = await db.select().from(table.user).where(eq(table.user.id, id));
	return row ?? null;
}

// Reject anything that isn't a path on this origin. Blocks protocol-relative
// (`//evil.com`) and absolute URLs so we can't be used as an open redirect.
export function sanitizeRedirectPath(redirectPath: string | null | undefined, fallback: string) {
	if (!redirectPath) return fallback;
	if (!redirectPath.startsWith("/") || redirectPath.startsWith("//")) return fallback;
	return redirectPath;
}
