import { betterAuth } from "better-auth";
import { bearer, oneTimeToken } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { parseSetCookieHeader } from "better-auth/cookies";
import type { RequestEvent } from "@sveltejs/kit";

import { db } from "@/lib/server/db/internal";
import { account, session, user, verification } from "@/lib/server/db/internal/schema";
import { generateUserId } from "@/lib/server/auth/auth";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getServerLogger } from "@/lib/server/logging";

const log = getServerLogger("auth");

const authConfig = getServerConfig().auth;
const discordConfig = authConfig.discord;
const authSecret = authConfig.secret || process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;

export const AUTH_BASE_PATH = "/api/auth";
export const IS_AUTH_ENABLED = Boolean(authConfig.enabled);

export const auth = IS_AUTH_ENABLED
	? betterAuth({
			secret: authSecret,
			baseURL: authConfig.baseUrl,
			basePath: AUTH_BASE_PATH,
			database: drizzleAdapter(db, {
				provider: "mysql",
				camelCase: true,
				usePlural: false,
				schema: { user, session, account, verification }
			}),
			trustedOrigins: [
				...(authConfig.baseUrl ? [authConfig.baseUrl] : []),
				// Native (Capacitor) webview origins + custom scheme, so the app can
				// call auth endpoints (bearer/one-time-token) and use the deep-link callback.
				"https://localhost",
				"capacitor://localhost",
				"diadem://"
			],
			// bearer: accept Authorization: Bearer <session token> (native has no cookies).
			// oneTimeToken: hand a session to the app after browser OAuth via a short-lived token.
			plugins: [bearer(), oneTimeToken()],
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
				encryptOAuthTokens: true,
				// Link an OAuth sign-in to a pre-existing user row when emails match
				// (used to keep pre-Better-Auth user rows attached on first login).
				accountLinking: {
					enabled: true,
					trustedProviders: ["discord"]
				}
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
					clientId: discordConfig?.clientId ?? "",
					clientSecret: discordConfig?.clientSecret ?? "",
					disableDefaultScope: true,
					scope: ["identify", "guilds.members.read"],
					mapProfileToUser: (profile) => ({
						discordId: profile.id,
						name: profile.global_name || profile.username,
						email: `${profile.id}@discord.internal`,
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

export function isAuthEnabled() {
	return IS_AUTH_ENABLED;
}

export function isAuthRequired() {
	return IS_AUTH_ENABLED && !authConfig.optional;
}

function applyAuthCookies(event: RequestEvent, headers: Headers) {
	// Headers.getSetCookie returns one entry per cookie; the joined Headers.get("set-cookie")
	// value can contain unescaped commas in the Expires attribute and misparses.
	const setCookies = headers.getSetCookie();
	for (const raw of setCookies) {
		for (const [name, { value, ...options }] of parseSetCookieHeader(raw)) {
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

	const accessToken = await getDiscordAccessToken(event);
	if (accessToken) {
		await revokeDiscordToken(accessToken);
	}

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

/**
 * The current session's bearer token, for handing the session to the native app
 * after browser OAuth. The session cookie value is `<token>.<signature>`; the
 * bearer plugin authenticates `Authorization: Bearer <token>`, so we hand the app
 * the raw token. (Preferred over one-time tokens, whose single-use consume path
 * is unreliable with this DB adapter.)
 */
export function getNativeAuthToken(event: RequestEvent): string | null {
	const cookie = event.cookies.getAll().find((c) => c.name.includes("session_token"));
	if (!cookie?.value) return null;
	const token = decodeURIComponent(cookie.value).split(".")[0];
	return token || null;
}

export async function getDiscordAccessToken(event: RequestEvent): Promise<string | null> {
	if (!auth) return null;
	try {
		const result = await auth.api.getAccessToken({
			headers: event.request.headers,
			body: { providerId: "discord" },
			returnHeaders: true
		});
		applyAuthCookies(event, result.headers);
		return result.response.accessToken || null;
	} catch (error) {
		log.warning(`Failed to fetch Discord access token from Better Auth: ${error}`);
		return null;
	}
}

async function revokeDiscordToken(accessToken: string) {
	const clientId = discordConfig?.clientId;
	const clientSecret = discordConfig?.clientSecret;
	if (!clientId || !clientSecret) return;

	try {
		await fetch("https://discord.com/api/oauth2/token/revoke", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
			},
			body: new URLSearchParams({ token: accessToken, token_type_hint: "access_token" })
		});
	} catch (error) {
		log.warning(`Failed to revoke Discord token: ${error}`);
	}
}
