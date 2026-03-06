import {
	boolean,
	datetime,
	index,
	json,
	mysqlTable,
	text,
	uniqueIndex,
	varchar
} from "drizzle-orm/mysql-core";

import type { Perms } from "@/lib/utils/features";

export const user = mysqlTable(
	"user",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		name: varchar("name", { length: 255 }).notNull(),
		email: varchar("email", { length: 255 }).notNull(),
		emailVerified: boolean("email_verified").notNull(),
		image: text("image"),
		discordId: varchar("discord_id", { length: 255 }).notNull().unique(),
		permissions: json("permissions"),
		userSettings: json("user_settings"),
		createdAt: datetime("created_at").notNull(),
		updatedAt: datetime("updated_at").notNull()
	},
	(table) => ({
		emailUnique: uniqueIndex("user_email_unique").on(table.email)
	})
);

export const session = mysqlTable(
	"session",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id),
		expiresAt: datetime("expires_at").notNull(),
		token: varchar("token", { length: 255 }).notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		createdAt: datetime("created_at").notNull(),
		updatedAt: datetime("updated_at").notNull()
	},
	(table) => ({
		tokenUnique: uniqueIndex("session_token_unique").on(table.token),
		userIdIdx: index("session_user_id_idx").on(table.userId),
		expiresAtIdx: index("session_expires_at_idx").on(table.expiresAt)
	})
);

export type Session = typeof session.$inferSelect;

export const account = mysqlTable(
	"account",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		accountId: varchar("account_id", { length: 255 }).notNull(),
		providerId: varchar("provider_id", { length: 255 }).notNull(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: datetime("access_token_expires_at"),
		refreshTokenExpiresAt: datetime("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: datetime("created_at").notNull(),
		updatedAt: datetime("updated_at").notNull()
	},
	(table) => ({
		providerAccountUnique: uniqueIndex("account_provider_account_unique").on(
			table.providerId,
			table.accountId
		),
		userIdIdx: index("account_user_id_idx").on(table.userId)
	})
);

export const verification = mysqlTable(
	"verification",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		identifier: varchar("identifier", { length: 255 }).notNull(),
		value: text("value").notNull(),
		expiresAt: datetime("expires_at").notNull(),
		createdAt: datetime("created_at").notNull(),
		updatedAt: datetime("updated_at").notNull()
	},
	(table) => ({
		identifierIdx: index("verification_identifier_idx").on(table.identifier),
		expiresAtIdx: index("verification_expires_at_idx").on(table.expiresAt)
	})
);

export type User = typeof user.$inferSelect & { permissions: Perms };
