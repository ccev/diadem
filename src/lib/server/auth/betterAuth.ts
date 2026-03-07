import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { parseSetCookieHeader } from "better-auth/cookies";
import type { RequestEvent } from "@sveltejs/kit";
import { sql } from "drizzle-orm";

import { db } from "@/lib/server/db/internal";
import { account, session, user, verification } from "@/lib/server/db/internal/schema";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("better-auth");

const DISCORD_SCOPES = ["identify", "guilds.members.read"];
const REQUIRED_AUTH_TABLES = ["user", "session", "account", "verification"] as const;
const REQUIRED_AUTH_COLUMNS: Readonly<
	Record<(typeof REQUIRED_AUTH_TABLES)[number], readonly string[]>
> = {
	user: [
		"id",
		"name",
		"email",
		"email_verified",
		"image",
		"discord_id",
		"permissions",
		"user_settings",
		"created_at",
		"updated_at"
	],
	session: [
		"id",
		"user_id",
		"expires_at",
		"token",
		"ip_address",
		"user_agent",
		"created_at",
		"updated_at"
	],
	account: [
		"id",
		"account_id",
		"provider_id",
		"user_id",
		"access_token",
		"refresh_token",
		"id_token",
		"access_token_expires_at",
		"refresh_token_expires_at",
		"scope",
		"password",
		"created_at",
		"updated_at"
	],
	verification: ["id", "identifier", "value", "expires_at", "created_at", "updated_at"]
};
const config = getServerConfig();
const authConfig = config.auth;
const discordConfig = authConfig.discord;
const discordClientId = discordConfig?.clientId?.trim();
const discordClientSecret = discordConfig?.clientSecret?.trim();
const rawAuthBaseUrl = authConfig.baseUrl?.trim();
const authSecret =
	authConfig.secret?.trim() ||
	process.env.BETTER_AUTH_SECRET?.trim() ||
	process.env.AUTH_SECRET?.trim();

const missingAuthConfig: string[] = [];
const invalidAuthConfig: string[] = [];

let authBaseUrl: string | null = null;
if (!rawAuthBaseUrl) {
	missingAuthConfig.push("server.auth.baseUrl");
} else {
	try {
		const parsedBaseUrl = new URL(rawAuthBaseUrl);
		const hasInvalidProtocol =
			parsedBaseUrl.protocol !== "http:" && parsedBaseUrl.protocol !== "https:";
		const hasExtraUrlParts =
			parsedBaseUrl.pathname !== "/" ||
			parsedBaseUrl.search.length > 0 ||
			parsedBaseUrl.hash.length > 0;

		if (hasInvalidProtocol || hasExtraUrlParts) {
			invalidAuthConfig.push(
				"server.auth.baseUrl must be an absolute public URL with scheme + host only, e.g. https://map.co"
			);
		} else {
			authBaseUrl = parsedBaseUrl.origin;
		}
	} catch {
		invalidAuthConfig.push(
			"server.auth.baseUrl must be an absolute public URL with scheme + host only, e.g. https://map.co"
		);
	}
}

if (!authSecret) {
	missingAuthConfig.push("server.auth.secret (or BETTER_AUTH_SECRET/AUTH_SECRET)");
}
if (!discordClientId) {
	missingAuthConfig.push("server.auth.discord.clientId");
}
if (!discordClientSecret) {
	missingAuthConfig.push("server.auth.discord.clientSecret");
}

if (authConfig.enabled && (missingAuthConfig.length > 0 || invalidAuthConfig.length > 0)) {
	throw new Error(
		`[AUTH_STARTUP_ERROR] Better Auth is enabled but config is invalid. ` +
			(missingAuthConfig.length > 0
				? `Missing required config: ${missingAuthConfig.join(", ")}. `
				: "") +
			(invalidAuthConfig.length > 0 ? `${invalidAuthConfig.join(" ")} ` : "") +
			"Set the values and restart. If auth is not intended, set server.auth.enabled=false."
	);
}

export const IS_BETTER_AUTH_ENABLED = Boolean(authConfig.enabled);

function isMissingTableError(error: unknown) {
	if (!error || typeof error !== "object") return false;
	const dbError = error as { code?: string; errno?: number };
	return dbError.code === "ER_NO_SUCH_TABLE" || dbError.errno === 1146;
}

function isMissingColumnError(error: unknown) {
	if (!error || typeof error !== "object") return false;
	const dbError = error as { code?: string; errno?: number };
	return dbError.code === "ER_BAD_FIELD_ERROR" || dbError.errno === 1054;
}

async function assertBetterAuthSchemaReady() {
	const missingTables: string[] = [];
	for (const tableName of REQUIRED_AUTH_TABLES) {
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
	for (const tableName of REQUIRED_AUTH_TABLES) {
		if (missingTables.includes(tableName)) continue;

		for (const columnName of REQUIRED_AUTH_COLUMNS[tableName]) {
			try {
				await db.execute(sql.raw(`SELECT \`${columnName}\` FROM \`${tableName}\` LIMIT 1`));
			} catch (error) {
				if (isMissingColumnError(error)) {
					missingColumns.push(`${tableName}.${columnName}`);
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
					redirectURI: discordConfig!.redirectUri || undefined,
					scope: DISCORD_SCOPES,
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

	const parsedCookies = parseSetCookieHeader(setCookieHeader);
	for (const [name, { value, ...options }] of parsedCookies) {
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
		} catch {}
	}
}

function createAuthRequest(
	event: RequestEvent,
	pathname: string,
	method: "GET" | "POST",
	body?: Record<string, unknown>
) {
	if (!auth) return null;

	const requestOrigin = authBaseUrl!;
	const url = new URL(`${auth.options.basePath}${pathname}`, requestOrigin);
	const headers = new Headers(event.request.headers);
	if (!headers.has("origin")) {
		headers.set("origin", requestOrigin);
	}
	if (!headers.has("referer")) {
		headers.set("referer", requestOrigin);
	}

	const requestInit: RequestInit = { method, headers };
	if (body) {
		headers.set("content-type", "application/json");
		requestInit.body = JSON.stringify(body);
	}

	return new Request(url, requestInit);
}

export async function signInWithDiscord(
	event: RequestEvent,
	options: {
		callbackURL: string;
		errorCallbackURL: string;
		scopes: string[];
	}
) {
	const request = createAuthRequest(event, "/sign-in/social", "POST", {
		provider: "discord",
		callbackURL: options.callbackURL,
		newUserCallbackURL: options.callbackURL,
		errorCallbackURL: options.errorCallbackURL,
		scopes: options.scopes,
		disableRedirect: true
	});
	if (!request || !auth) return null;

	const response = await auth.handler(request);
	applyAuthCookies(event, response.headers);

	if (!response.ok) {
		return null;
	}

	return (await response.json()) as {
		url?: string;
		redirect: boolean;
	};
}

export async function signOut(event: RequestEvent) {
	const request = createAuthRequest(event, "/sign-out", "POST", {});
	if (!request || !auth) return false;

	const response = await auth.handler(request);
	applyAuthCookies(event, response.headers);
	return response.ok;
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
