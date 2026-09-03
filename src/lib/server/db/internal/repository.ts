import { db } from "@/lib/server/db/internal/index";
import * as table from "@/lib/server/db/internal/schema";
import { eq, sql } from "drizzle-orm";
import type { UserSettings } from "$lib/services/userSettings.svelte";

export async function setUserSettings(userId: string, userSettings: unknown) {
	await db.update(table.user).set({ userSettings }).where(eq(table.user.id, userId));
}

export async function getUserSettings(userId: string): Promise<unknown> {
	const [result] = await db
		.select({ user: { userSettings: table.user.userSettings } })
		.from(table.user)
		.where(eq(table.user.id, userId));

	return result?.user?.userSettings;
}

export async function setUserMapPosition(
	userId: string,
	mapPosition: UserSettings["mapPosition"]
): Promise<void> {
	await db
		.update(table.user)
		.set({
			userSettings: sql`JSON_MERGE_PATCH(
				CASE
					WHEN JSON_TYPE(${table.user.userSettings}) = 'STRING'
					THEN JSON_EXTRACT(JSON_UNQUOTE(${table.user.userSettings}), '$')
					ELSE COALESCE(${table.user.userSettings}, '{}')
				END,
				${JSON.stringify({ mapPosition })}
			)`
		})
		.where(eq(table.user.id, userId));
}
