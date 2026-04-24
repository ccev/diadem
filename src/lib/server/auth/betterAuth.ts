import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { parseSetCookieHeader } from "better-auth/cookies";
import type { RequestEvent } from "@sveltejs/kit";
import { getTableColumns, getTableName, sql } from "drizzle-orm";

import { db } from "@/lib/server/db/internal";
import { account, session, user, verification } from "@/lib/server/db/internal/schema";
import { generateUserId } from "@/lib/server/auth/auth";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("better-auth");

const authTables = [user, session, account, verification] as const;
const authConfig = getServerConfig().auth;
const discordConfig = authConfig.discord;
const discordClientId = discordConfig?.clientId?.trim();
const discordClientSecret = discordConfig?.clientSecret?.trim();
const rawAuthBaseUrl = authConfig.baseUrl?.trim();
const authSecret =
	authConfig.secret?.trim() ||
	process.env.BETTER_AUTH_SECRET?.trim() ||
	process.env.AUTH_SECRET?.trim();

const authErrors: string[] = [];

let authBaseUrl: string | null = null;
if (!rawAuthBaseUrl) {
	authErrors.push("server.auth.baseUrl is required");
} else {
	try {
		const parsed = new URL(rawAuthBaseUrl);
		const isOriginOnly =
			(parsed.protocol === "http:" || parsed.protocol === "https:") &&
			parsed.pathname === "/" &&
			!parsed.search &&
			!parsed.hash;
		if (!isOriginOnly) throw new Error();
		authBaseUrl = parsed.origin;
	} catch {
		authErrors.push(
			"server.auth.baseUrl must be an absolute URL with scheme + host only, e.g. https://map.co"
		);
	}
}

if (!authSecret) authErrors.push("server.auth.secret (or BETTER_AUTH_SECRET env)");
if (!discordClientId) authErrors.push("server.auth.discord.clientId");
if (!discordClientSecret) authErrors.push("server.auth.discord.clientSecret");

if (authConfig.enabled && authErrors.length > 0) {
	throw new Error(
		`[AUTH_STARTUP_ERROR] Better Auth config is invalid:\n  - ${authErrors.join("\n  - ")}\n` +
			"Set the values and restart, or set server.auth.enabled=false."
	);
}

export const IS_BETTER_AUTH_ENABLED = Boolean(authConfig.enabled);

function hasMysqlCode(error: unknown, code: string, errno: number): boolean {
	if (!error || typeof error !== "object") return false;
	const e = error as { code?: string; errno?: number };
	return e.code === code || e.errno === errno;
}
const isMissingTableError = (error: unknown) => hasMysqlCode(error, "ER_NO_SUCH_TABLE", 1146);
const isMissingColumnError = (error: unknown) => hasMysqlCode(error, "ER_BAD_FIELD_ERROR", 1054);

async function assertBetterAuthSchemaReady() {
	const missingTables: string[] = [];
	for (const table of authTables) {
		const tableName = getTableName(table);
		try {
			await db.execute(sql.raw(`SELECT 1 FROM \`${tableName}\` LIMIT 1`));
		} catch (error) {
			if (isMissingTableError(error)) {
				missingTables.push(tableName);
				continue;
			}

			throw new Error(
				`[AUTH_STARTUP_ERROR] Failed checking Better Auth schema readiness: ${error}`
			);
		}
	}

	const missingColumns: string[] = [];
	for (const table of authTables) {
		const tableName = getTableName(table);
		if (missingTables.includes(tableName)) continue;

		for (const column of Object.values(getTableColumns(table))) {
			try {
				await db.execute(sql.raw(`SELECT \`${column.name}\` FROM \`${tableName}\` LIMIT 1`));
			} catch (error) {
				if (isMissingColumnError(error)) {
					missingColumns.push(`${tableName}.${column.name}`);
					continue;
				}

				throw new Error(
					`[AUTH_STARTUP_ERROR] Failed checking Better Auth schema readiness: ${error}`
				);
			}
		}
	}

	if (missingTables.length > 0 || missingColumns.length > 0) {
		const missingTableMessage =
			missingTables.length > 0 ? `Missing tables: ${missingTables.join(", ")}. ` : "";
		const missingColumnMessage =
			missingColumns.length > 0 ? `Missing columns: ${missingColumns.join(", ")}. ` : "";
		throw new Error(
			`[AUTH_STARTUP_ERROR] Better Auth schema is incomplete. ${missingTableMessage}${missingColumnMessage}` +
				"Run your DB migration before starting the app."
		);
	}
}

let startupReadinessPromise: Promise<void> | null = null;
export async function assertBetterAuthStartupReadiness() {
	if (!IS_BETTER_AUTH_ENABLED) return;
	if (!startupReadinessPromise) {
		startupReadinessPromise = assertBetterAuthSchemaReady();
	}
	await startupReadinessPromise;
}

export const auth = IS_BETTER_AUTH_ENABLED
	? betterAuth({
			secret: authSecret!,
			baseURL: authBaseUrl!,
			basePath: "/api/auth",
			database: drizzleAdapter(db, {
				provider: "mysql",
				camelCase: true,
				usePlural: false,
				schema: {
					user,
					session,
					account,
					verification
				}
			}),
			trustedOrigins: [authBaseUrl!],
			advanced: {
				database: {
					generateId: () => generateUserId()
				}
			},
			session: {
				expiresIn: 60 * 60 * 24 * 30,
				updateAge: 60 * 60 * 24 * 15
			},
			account: {
				encryptOAuthTokens: true
			},
			user: {
				additionalFields: {
					discordId: {
						type: "string",
						required: true,
						unique: true,
						input: false,
						returned: true
					}
				}
			},
			socialProviders: {
				discord: {
					clientId: discordClientId!,
					clientSecret: discordClientSecret!,
					scope: ["identify", "guilds.members.read"],
					mapProfileToUser: (profile) => ({
						discordId: profile.id,
						name: profile.global_name || profile.username,
						email: `${profile.id}@discord.diadem.local`,
						emailVerified: true,
						image: profile.image_url || undefined
					})
				}
			}
		})
	: null;

type AuthInstance = NonNullable<typeof auth>;
export type BetterAuthSession = AuthInstance["$Infer"]["Session"];
export type BetterAuthSessionData = BetterAuthSession["session"];
export type BetterAuthUserData = BetterAuthSession["user"];

export function isAuthFeatureEnabled() {
	return IS_BETTER_AUTH_ENABLED;
}

export function isAuthRequiredEnabled() {
	return isAuthFeatureEnabled() && !authConfig.optional;
}

export function getAuthBaseUrl() {
	return authBaseUrl;
}

function applyAuthCookies(event: RequestEvent, headers: Headers) {
	const setCookieHeader = headers.get("set-cookie");
	if (!setCookieHeader) return;

	for (const [name, { value, ...options }] of parseSetCookieHeader(setCookieHeader)) {
		try {
			event.cookies.set(name, value, {
				sameSite: options.samesite,
				path: options.path || "/",
				expires: options.expires,
				secure: options.secure,
				httpOnly: options.httponly,
				domain: options.domain,
				maxAge: options["max-age"]
			});
		} catch (error) {
			log.warning(`Failed to set auth cookie ${name}: ${error}`);
		}
	}
}

export async function signInWithDiscord(
	event: RequestEvent,
	options: { callbackURL: string; errorCallbackURL: string }
) {
	if (!auth) return null;
	try {
		const result = await auth.api.signInSocial({
			body: {
				provider: "discord",
				callbackURL: options.callbackURL,
				newUserCallbackURL: options.callbackURL,
				errorCallbackURL: options.errorCallbackURL,
				disableRedirect: true
			},
			headers: event.request.headers,
			returnHeaders: true
		});
		applyAuthCookies(event, result.headers);
		return result.response as { url?: string; redirect: boolean };
	} catch (error) {
		log.warning(`Sign-in with Discord failed: ${error}`);
		return null;
	}
}

export async function signOut(event: RequestEvent) {
	if (!auth) return false;
	try {
		const result = await auth.api.signOut({
			headers: event.request.headers,
			returnHeaders: true
		});
		applyAuthCookies(event, result.headers);
		return true;
	} catch (error) {
		log.warning(`Sign-out failed: ${error}`);
		return false;
	}
}

export async function getAuthSession(event: RequestEvent): Promise<BetterAuthSession | null> {
	if (!auth) return null;
	try {
		const result = await auth.api.getSession({
			headers: event.request.headers,
			returnHeaders: true
		});
		applyAuthCookies(event, result.headers);
		return result.response;
	} catch (error) {
		log.warning(`Failed to read auth session: ${error}`);
		return null;
	}
}

export async function getDiscordAccessToken(event: RequestEvent): Promise<string | null> {
	if (!auth) return null;
	try {
		const result = await auth.api.getAccessToken({
			headers: event.request.headers,
			body: {
				providerId: "discord"
			},
			returnHeaders: true
		});
		applyAuthCookies(event, result.headers);
		return result.response.accessToken || null;
	} catch (error) {
		log.warning(`Failed to fetch Discord access token from Better Auth: ${error}`);
		return null;
	}
}
