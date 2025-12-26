import { db } from '@/lib/server/db/internal/index';
import * as table from '@/lib/server/db/internal/schema';
import { eq } from 'drizzle-orm';
import type { UserSettings } from '@/lib/services/userSettings.svelte.js';
import type { Perms } from "@/lib/utils/features";

export async function setUserSettings(userId: string, userSettings: string) {
	const u = await db
		.update(table.user)
		.set({ userSettings })
		.where(eq(table.user.id, userId));
}

export async function getUserSettings(userId: string): Promise<undefined | string> {
	const [result] = await db
		.select({ user: { userSettings: table.user.userSettings } })
		.from(table.user)
		.where(eq(table.user.id, userId));

	return result?.user?.userSettings as string | undefined
}