import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { GenericOAuthConfig } from "better-auth/plugins/generic-oauth";

export const TELEGRAM_ISSUER = "https://oauth.telegram.org";
const telegramKeys = createRemoteJWKSet(new URL(`${TELEGRAM_ISSUER}/.well-known/jwks.json`), {
	timeoutDuration: 5000,
	cooldownDuration: 30000,
	cacheMaxAge: 60 * 60 * 1000
});

export async function verifyTelegramIdentity(
	token: string,
	clientId: string,
	keys: JWTVerifyGetKey = telegramKeys
) {
	const { payload } = await jwtVerify(token, keys, {
		issuer: TELEGRAM_ISSUER,
		audience: clientId,
		algorithms: ["RS256", "ES256"],
		requiredClaims: ["sub", "iat", "exp", "id"]
	});
	// Telegram's OIDC sub is NOT the Bot API user id. Only the signed profile.id
	// can be used for getChatMember. Never derive either identity from a username.
	if (
		typeof payload.sub !== "string" ||
		!payload.sub ||
		!Number.isSafeInteger(payload.id) ||
		Number(payload.id) <= 0
	) {
		throw new Error("Invalid Telegram identity");
	}
	const id = String(payload.id);
	return {
		id,
		name: typeof payload.name === "string" && payload.name ? payload.name : `Telegram ${id}`,
		image: typeof payload.picture === "string" ? payload.picture : undefined,
		// Better Auth requires an email. This is a non-deliverable internal key,
		// never a verified email or a basis for implicit account linking.
		email: `${id}@telegram.invalid`,
		emailVerified: false
	};
}

export function telegramOAuth(config: {
	clientId: string;
	clientSecret: string;
}): GenericOAuthConfig {
	return {
		providerId: "telegram",
		...config,
		authorizationUrl: `${TELEGRAM_ISSUER}/auth`,
		tokenUrl: `${TELEGRAM_ISSUER}/token`,
		issuer: TELEGRAM_ISSUER,
		authentication: "basic",
		pkce: true,
		scopes: ["openid", "profile"],
		async getUserInfo(tokens) {
			if (!tokens.idToken) return null;
			try {
				return await verifyTelegramIdentity(tokens.idToken, config.clientId);
			} catch {
				// Do not log tokens, claims, URLs containing credentials, or upstream errors.
				return null;
			}
		}
	};
}
