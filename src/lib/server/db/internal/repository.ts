import { db } from "@/lib/server/db/internal/index";
import * as table from "@/lib/server/db/internal/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID, createHash } from "node:crypto";
import { emptyPushAlertRules, type PushAlertRules } from "@/lib/server/push/types";
import { pushAlertRulesSchema } from "@/lib/server/push/schemas";
import type { StoredSubscription } from "@/lib/server/push/types";

function parseJsonColumn<T>(value: unknown): T | undefined {
	if (value == null) return undefined;
	if (typeof value !== "string") return value as T;
	return JSON.parse(value) as T;
}

export async function setUserSettings(userId: string, userSettings: unknown) {
	await db.update(table.user).set({ userSettings }).where(eq(table.user.id, userId));
}

export async function getUserSettings<T = unknown>(userId: string): Promise<T | undefined> {
	const [result] = await db
		.select({ user: { userSettings: table.user.userSettings } })
		.from(table.user)
		.where(eq(table.user.id, userId));

	return parseJsonColumn<T>(result?.user?.userSettings);
}

export function hashEndpoint(endpoint: string): string {
	return createHash("sha256").update(endpoint).digest("hex");
}

export async function upsertPushSubscription(input: {
	userId: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	userAgent: string | null;
}): Promise<void> {
	const endpointHash = hashEndpoint(input.endpoint);
	const now = new Date();
	const [existing] = await db
		.select({ id: table.pushSubscription.id })
		.from(table.pushSubscription)
		.where(eq(table.pushSubscription.endpointHash, endpointHash));

	if (existing) {
		await db
			.update(table.pushSubscription)
			.set({
				userId: input.userId,
				endpoint: input.endpoint,
				p256dh: input.p256dh,
				auth: input.auth,
				userAgent: input.userAgent,
				failureCount: 0,
				updatedAt: now
			})
			.where(eq(table.pushSubscription.id, existing.id));
		return;
	}

	await db.insert(table.pushSubscription).values({
		id: randomUUID(),
		userId: input.userId,
		endpoint: input.endpoint,
		endpointHash,
		p256dh: input.p256dh,
		auth: input.auth,
		userAgent: input.userAgent,
		failureCount: 0,
		createdAt: now,
		updatedAt: now
	});
}

export async function deletePushSubscriptionByEndpoint(
	userId: string,
	endpoint: string
): Promise<void> {
	await db
		.delete(table.pushSubscription)
		.where(
			and(
				eq(table.pushSubscription.userId, userId),
				eq(table.pushSubscription.endpointHash, hashEndpoint(endpoint))
			)
		);
}

export async function deletePushSubscriptionByHash(endpointHash: string): Promise<void> {
	await db
		.delete(table.pushSubscription)
		.where(eq(table.pushSubscription.endpointHash, endpointHash));
}

export async function getPushSubscriptions(userId: string): Promise<StoredSubscription[]> {
	const rows = await db
		.select()
		.from(table.pushSubscription)
		.where(eq(table.pushSubscription.userId, userId));
	return rows.map((r) => ({
		id: r.id,
		endpoint: r.endpoint,
		endpointHash: r.endpointHash,
		p256dh: r.p256dh,
		auth: r.auth
	}));
}

export async function getPushAlerts(userId: string): Promise<PushAlertRules> {
	const [row] = await db
		.select({ pushAlerts: table.user.pushAlerts })
		.from(table.user)
		.where(eq(table.user.id, userId));

	const raw = parseJsonColumn<unknown>(row?.pushAlerts);
	if (raw == null) return emptyPushAlertRules();

	// Tolerate legacy array storage and any invalid shape by resetting to empty.
	const parsed = pushAlertRulesSchema.safeParse(raw);
	if (!parsed.success) return emptyPushAlertRules();
	return parsed.data;
}

export async function setPushAlerts(userId: string, rules: PushAlertRules): Promise<void> {
	await db.update(table.user).set({ pushAlerts: rules }).where(eq(table.user.id, userId));
}

/** Returns userIds that have at least one push subscription. The caller
 *  filters further by enabled rules when building registry entries. */
export async function getSubscribedUserIds(): Promise<string[]> {
	const rows = await db
		.selectDistinct({ userId: table.pushSubscription.userId })
		.from(table.pushSubscription);
	return rows.map((r) => r.userId);
}

/** Stored Discord access token for a user (may be expired). "" if none. */
export async function getDiscordAccessTokenForUser(userId: string): Promise<string> {
	const [row] = await db
		.select({ accessToken: table.account.accessToken })
		.from(table.account)
		.where(and(eq(table.account.userId, userId), eq(table.account.providerId, "discord")));
	return row?.accessToken ?? "";
}
