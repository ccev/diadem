import { betterAuth } from "better-auth";
import { bearer, genericOAuth } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { parseSetCookieHeader } from "better-auth/cookies";
import type { RequestEvent } from "@sveltejs/kit";

import { db } from "@/lib/server/db/internal";
import { account, session, user, verification } from "@/lib/server/db/internal/schema";
import { generateUserId, getUserByDiscordId } from "@/lib/server/auth/auth";
import { getClientConfig, getServerConfig } from "@/lib/services/config/config.server";
import { telegramOAuth } from "./telegram";
import type { AuthProvider } from "@/lib/services/config/configTypes";
import { getServerLogger } from "@/lib/server/logging";

const log = getServerLogger("auth");

const authConfig = getServerConfig().auth;
const discordConfig = authConfig.discord;
const providers = getClientConfig().auth!.providers;
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
			plugins: [
				bearer(),
				genericOAuth({
					config:
						providers.includes("telegram") && authConfig.telegram
							? [
									telegramOAuth({
										clientId: authConfig.telegram.clientId,
										clientSecret: authConfig.telegram.clientSecret
									})
								]
							: []
				})
			],
			// Upstream OAuth exceptions can include token responses. Log only our fixed messages.
			logger: { disabled: true },
			onAPIError: { errorURL: "/login/error/callback?error=1" },
			advanced: {
				disableOriginCheck: false,
				disableCSRFCheck: false,
				database: {
					generateId: () => generateUserId()
				}
			},
			session: {
				expiresIn: 60 * 60 * 24 * 30,
				updateAge: 60 * 60 * 24 * 15
			},
			databaseHooks: {
				account: {
					create: {
						before: async (account) => {
							// Pre-Better-Auth users may still have only user.discord_id,
							// with no account row until their first migrated sign-in.
							// Explicit linking must not strand that user's settings.
							if (account.providerId === "discord") {
								const legacy = await getUserByDiscordId(account.accountId);
								if (legacy && legacy.id !== account.userId) return false;
							}
							return { data: account };
						}
					}
				}
			},
			account: {
				encryptOAuthTokens: true,
				// Link an OAuth sign-in to a pre-existing user row when emails match
				// (used to keep pre-Better-Auth user rows attached on first login).
				accountLinking: {
					enabled: true,
					trustedProviders: ["discord"],
					// Explicit OAuth linking proves both identities; Telegram stays untrusted
					// for implicit email linking (its internal email is never verified).
					allowDifferentEmails: true
				}
			},
			user: {
				additionalFields: {
					discordId: {
						type: "string",
						required: false,
						unique: true,
						input: false,
						returned: true
					}
				}
			},
			socialProviders: {
				...(providers.includes("discord")
					? {
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
					: {})
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
			} catch {
				log.warning("Failed to set auth cookie");
			}
		}
	}
}

export async function signInWithProvider(
	event: RequestEvent,
	provider: AuthProvider,
	options: { callbackURL: string; errorCallbackURL: string }
) {
	if (!auth || !providers.includes(provider)) return null;
	try {
		const result =
			provider === "telegram"
				? await auth.api.signInWithOAuth2({
						body: {
							providerId: provider,
							...options,
							newUserCallbackURL: options.callbackURL,
							disableRedirect: true
						},
						headers: event.request.headers,
						returnHeaders: true
					})
				: await auth.api.signInSocial({
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
	} catch {
		log.warning("Provider sign-in failed");
		return null;
	}
}

export async function linkProvider(
	event: RequestEvent,
	provider: AuthProvider,
	callbackURL: string
) {
	if (!auth || !providers.includes(provider)) return null;
	try {
		const result =
			provider === "telegram"
				? await auth.api.oAuth2LinkAccount({
						body: { providerId: provider, callbackURL, errorCallbackURL: `${callbackURL}?error=1` },
						headers: event.request.headers,
						returnHeaders: true
					})
				: await auth.api.linkSocialAccount({
						body: { provider, callbackURL, errorCallbackURL: `${callbackURL}?error=1` },
						headers: event.request.headers,
						returnHeaders: true
					});
		applyAuthCookies(event, result.headers);
		return result.response;
	} catch {
		log.warning("Account linking failed");
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
	} catch {
		log.warning("Sign-out failed");
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
	} catch {
		log.warning("Failed to read auth session");
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
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		// Better Auth may refresh the linked Discord token here. A stalled refresh
		// must not indefinitely block Telegram authorization. Only the library owns
		// the refresh operation; do not apply late response cookies to this request.
		const result = await Promise.race([
			auth.api.getAccessToken({
				headers: event.request.headers,
				body: { providerId: "discord" },
				returnHeaders: true
			}),
			new Promise<null>((resolve) => {
				timeout = setTimeout(() => resolve(null), 5000);
			})
		]);
		if (!result) return null;
		applyAuthCookies(event, result.headers);
		return result.response.accessToken || null;
	} catch {
		// No Discord identity, expired credentials or provider outage: other identities still work.
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

async function revokeDiscordToken(accessToken: string) {
	const clientId = discordConfig?.clientId;
	const clientSecret = discordConfig?.clientSecret;
	if (!clientId || !clientSecret) return;

	try {
		await fetch("https://discord.com/api/oauth2/token/revoke", {
			signal: AbortSignal.timeout(5000),
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
			},
			body: new URLSearchParams({ token: accessToken, token_type_hint: "access_token" })
		});
	} catch {
		log.warning("Failed to revoke Discord token");
	}
}
