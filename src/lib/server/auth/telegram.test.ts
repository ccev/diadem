import { describe, it, expect, beforeAll } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { TELEGRAM_ISSUER, telegramOAuth, verifyTelegramIdentity } from "./telegram";

describe("Telegram signed identity", () => {
	let keys: Awaited<ReturnType<typeof generateKeyPair>>;
	let jwks: ReturnType<typeof createLocalJWKSet>;
	beforeAll(async () => {
		keys = await generateKeyPair("RS256");
		jwks = createLocalJWKSet({ keys: [await exportJWK(keys.publicKey)] });
	});
	async function token(overrides: Record<string, unknown> = {}) {
		return new SignJWT({
			sub: "oidc-sub-not-bot-id",
			id: 1234567,
			name: "Same name",
			preferred_username: "mutable",
			iss: TELEGRAM_ISSUER,
			aud: "123",
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 60,
			...overrides
		})
			.setProtectedHeader({ alg: "RS256" })
			.sign(keys.privateKey);
	}
	it("uses the signed numeric profile id, not OIDC sub or username", async () => {
		expect(await verifyTelegramIdentity(await token(), "123", jwks)).toEqual({
			id: "1234567",
			name: "Same name",
			email: "1234567@telegram.invalid",
			emailVerified: false,
			image: undefined
		});
	});
	it.each([
		{ iss: "https://evil.example" },
		{ aud: "other" },
		{ exp: 1 },
		{ id: "1234567" },
		{ id: -1 },
		{ id: Number.MAX_SAFE_INTEGER + 1 },
		{ sub: "" },
		{ exp: undefined },
		{ iat: undefined }
	])("rejects invalid claims %j", async (claims) => {
		await expect(verifyTelegramIdentity(await token(claims), "123", jwks)).rejects.toThrow();
	});
	it("rejects unsigned and forged signatures", async () => {
		const signed = await token();
		const [header, payload, signature] = signed.split(".");
		await expect(
			verifyTelegramIdentity(
				`${header}.${payload}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`,
				"123",
				jwks
			)
		).rejects.toThrow();
		await expect(
			verifyTelegramIdentity(`${btoa('{"alg":"none"}')}.${payload}.`, "123", jwks)
		).rejects.toThrow();
	});
	it("uses PKCE/basic code flow without UserInfo or unsigned fallback", async () => {
		const config = telegramOAuth({ clientId: "123", clientSecret: "secret" });
		expect(config).toMatchObject({
			pkce: true,
			authentication: "basic",
			scopes: ["openid", "profile"]
		});
		expect(config.userInfoUrl).toBeUndefined();
		expect(await config.getUserInfo!({ accessToken: "access" })).toBeNull();
		expect(await config.getUserInfo!({ idToken: "invalid" })).toBeNull();
	});
});
