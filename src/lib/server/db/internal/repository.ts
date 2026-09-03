import { db } from "@/lib/server/db/internal/index";
import * as table from "@/lib/server/db/internal/schema";
import { eq, sql } from "drizzle-orm";
import type { UserSettings } from "$lib/services/userSettings.svelte";

export async function setUserSettings(userId: string, userSettings: string) {
	const u = await db.update(table.user).set({ userSettings }).where(eq(table.user.id, userId));
}

export async function getUserSettings(userId: string): Promise<undefined | string> {
	const [result] = await db
		.select({ user: { userSettings: table.user.userSettings } })
		.from(table.user)
		.where(eq(table.user.id, userId));

	return result?.user?.userSettings as string | undefined;
}

export async function setUserMapPosition(
	userId: string,
	mapPosition: UserSettings["mapPosition"]
): Promise<void> {
	await db
		.update(table.user)
		.set({
			userSettings: sql`JSON_MERGE_PATCH(COALESCE(${table.user.userSettings}, '{}'), ${JSON.stringify({ mapPosition })})`
		})
		.where(eq(table.user.id, userId));
}
