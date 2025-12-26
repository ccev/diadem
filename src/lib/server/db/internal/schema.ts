import { datetime, json, mysqlTable, varchar } from "drizzle-orm/mysql-core";

import type { Perms } from "@/lib/utils/features";

export const user = mysqlTable("user", {
	id: varchar("id", { length: 255 }).primaryKey(),
	discordId: varchar("discord_id", { length: 255 }).notNull().unique(),
	permissions: json("permissions").notNull(),
	userSettings: json("user_settings").notNull()
});

export const session = mysqlTable("session", {
	id: varchar("id", { length: 255 }).primaryKey(),
	userId: varchar("user_id", { length: 255 })
		.notNull()
		.references(() => user.id),
	expiresAt: datetime("expires_at").notNull(),
	discordToken: varchar("discord_token", { length: 255 }).notNull(),
	discordRefreshToken: varchar("discord_refresh_token", { length: 255 }).notNull(),
	discordLastRefresh: datetime("discord_last_refresh").notNull()
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect & { permissions: Perms };
