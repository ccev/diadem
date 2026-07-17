import { db } from "@/lib/server/db/internal/index";
import * as table from "@/lib/server/db/internal/schema";
import { and, eq } from "drizzle-orm";

export type ConnectedAccountState = "active" | "pending" | "inactive";

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

export async function listConnectedAccounts(userId: string) {
	return db.select().from(table.connectedAccount).where(eq(table.connectedAccount.userId, userId));
}

export async function upsertConnectedAccount(
	userId: string,
	account: {
		friendCode: string;
		nickname: string;
		team: number;
		level: number;
		state: ConnectedAccountState;
	}
) {
	const lastUpdated = new Date();
	await db
		.insert(table.connectedAccount)
		.values({ userId, ...account, lastUpdated })
		.onDuplicateKeyUpdate({ set: { ...account, lastUpdated } });
}

export async function markConnectedAccountInactive(userId: string, friendCode: string) {
	await db
		.update(table.connectedAccount)
		.set({ state: "inactive", lastUpdated: new Date() })
		.where(
			and(
				eq(table.connectedAccount.userId, userId),
				eq(table.connectedAccount.friendCode, friendCode)
			)
		);
}

export async function deleteConnectedAccount(userId: string, friendCode: string) {
	await db
		.delete(table.connectedAccount)
		.where(
			and(
				eq(table.connectedAccount.userId, userId),
				eq(table.connectedAccount.friendCode, friendCode)
			)
		);
}
