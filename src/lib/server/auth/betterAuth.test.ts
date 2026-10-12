import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { parseSetCookieHeader } from "better-auth/cookies";
import { createHash } from "node:crypto";

const fixtures = vi.hoisted(() => ({
	db: { user: [], account: [], session: [], verification: [] } as Record<string, any[]>,
	keys: undefined as any,
	logs: vi.fn()
}));
vi.mock("jose", async (original) => ({
	...(await original<typeof import("jose")>()),
	createRemoteJWKSet:
		() =>
		(...args: any[]) =>
			fixtures.keys(...args)
}));
vi.mock("better-auth/adapters/drizzle", async () => {
	const { memoryAdapter } = await import("better-auth/adapters/memory");
	return { drizzleAdapter: () => memoryAdapter(fixtures.db) };
});
vi.mock("@/lib/server/db/internal", () => ({ db: {} }));
vi.mock("@/lib/server/auth/auth", async (original) => ({
	...(await original<typeof import("./auth")>()),
	getUserByDiscordId: async (discordId: string) =>
		fixtures.db.user.find((user) => user.discordId === discordId) ?? null
}));
vi.mock("@/lib/server/logging", () => ({
	getServerLogger: () => ({ warning: fixtures.logs, info: fixtures.logs })
}));
vi.mock("@/lib/services/config/config.server", () => ({
	getClientConfig: () => ({ auth: { providers: ["discord", "telegram"] } }),
	getServerConfig: () => ({
		auth: {
			enabled: true,
			optional: true,
			baseUrl: "https://map.example.test",
			secret: "test-secret-at-least-thirty-two-characters-long",
			discord: { clientId: "discord-client", clientSecret: "discord-secret" },
			telegram: { clientId: "123", clientSecret: "telegram-secret" }
		}
	})
}));

import { auth, getDiscordAccessToken } from "./betterAuth";
import type { RequestEvent } from "@sveltejs/kit";

const origin = "https://map.example.test";
let privateKey: CryptoKey;
let telegramId = 1234567;
let discordId = "7654321";
let invalidToken = false;
let exchangeError = false;
let tokenRequest: Request | undefined;

beforeAll(async () => {
	const keys = await generateKeyPair("RS256");
	privateKey = keys.privateKey;
	fixtures.keys = createLocalJWKSet({ keys: [await exportJWK(keys.publicKey)] });
});
beforeEach(() => {
	for (const key of Object.keys(fixtures.db)) fixtures.db[key].length = 0;
	telegramId = 1234567;
	discordId = "7654321";
	invalidToken = false;
	exchangeError = false;
	tokenRequest = undefined;
	fixtures.logs.mockClear();
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const request = new Request(input, init);
			const url = request.url;
			if (url === "https://oauth.telegram.org/token") {
				tokenRequest = request.clone();
				if (exchangeError) return Response.json({ error: "invalid_grant" }, { status: 400 });
				const idToken = invalidToken
					? "unsigned.invalid.token"
					: await new SignJWT({ id: telegramId, name: "Same display name" })
							.setProtectedHeader({ alg: "RS256" })
							.setSubject(`oidc-${telegramId}`)
							.setIssuer("https://oauth.telegram.org")
							.setAudience("123")
							.setIssuedAt()
							.setExpirationTime("5m")
							.sign(privateKey);
				return Response.json({
					access_token: "telegram-access-secret",
					token_type: "Bearer",
					expires_in: 300,
					id_token: idToken
				});
			}
			if (url.includes("discord.com/api/oauth2/token"))
				return Response.json({
					access_token: "discord-access-secret",
					token_type: "Bearer",
					expires_in: 300
				});
			if (
				url.includes("discord.com/api") &&
				decodeURIComponent(new URL(url).pathname).endsWith("/users/@me")
			)
				return Response.json({
					id: discordId,
					username: "mutable",
					global_name: "Same display name",
					avatar: null,
					discriminator: "0"
				});
			throw new Error(`Unexpected test fetch ${new URL(url).origin}`);
		})
	);
});
afterEach(() => vi.unstubAllGlobals());

class Browser {
	cookies = new Map<string, string>();
	async request(path: string, body?: object) {
		const response = await auth!.handler(
			new Request(`${origin}${path}`, {
				method: body ? "POST" : "GET",
				headers: {
					origin,
					"Content-Type": "application/json",
					cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; ")
				},
				...(body ? { body: JSON.stringify(body) } : {})
			})
		);
		for (const raw of response.headers.getSetCookie()) {
			for (const [key, options] of parseSetCookieHeader(raw)) {
				if (options["max-age"] === 0) this.cookies.delete(key);
				else this.cookies.set(key, options.value);
			}
		}
		return response;
	}
	async begin(provider: "discord" | "telegram", link = false) {
		const path =
			provider === "telegram"
				? link
					? "/oauth2/link"
					: "/sign-in/oauth2"
				: link
					? "/link-social"
					: "/sign-in/social";
		const response = await this.request(`/api/auth${path}`, {
			...(provider === "telegram" ? { providerId: provider } : { provider }),
			callbackURL: "/done",
			errorCallbackURL: "/failed",
			disableRedirect: true
		});
		expect(response.status).toBe(200);
		return new URL((await response.json()).url);
	}
	async finish(provider: "discord" | "telegram", url: URL) {
		const path = provider === "telegram" ? "oauth2/callback" : "callback";
		return this.request(
			`/api/auth/${path}/${provider}?code=one-time-code&state=${encodeURIComponent(url.searchParams.get("state")!)}`
		);
	}
	async login(provider: "discord" | "telegram") {
		return this.finish(provider, await this.begin(provider));
	}
}

describe("installed Better Auth code flow integration", () => {
	it("bounds stalled Discord token refresh without applying late cookies", async () => {
		vi.useFakeTimers();
		const getToken = vi
			.spyOn(auth!.api, "getAccessToken")
			.mockImplementation(() => new Promise(() => {}));
		const request = {
			request: new Request(origin),
			cookies: { set: vi.fn() }
		} as unknown as RequestEvent;
		try {
			const result = getDiscordAccessToken(request);
			await vi.advanceTimersByTimeAsync(5001);
			expect(await result).toBeNull();
			expect(request.cookies.set).not.toHaveBeenCalled();
		} finally {
			getToken.mockRestore();
			vi.useRealTimers();
		}
	});
	it("creates a stable Telegram-only account with PKCE, registered redirect and basic token authentication", async () => {
		const browser = new Browser();
		const url = await browser.begin("telegram");
		expect(url.searchParams.get("code_challenge_method")).toBe("S256");
		expect(url.searchParams.get("code_challenge")).toBeTruthy();
		expect(url.searchParams.get("redirect_uri")).toBe(
			`${origin}/api/auth/oauth2/callback/telegram`
		);
		expect((await browser.finish("telegram", url)).headers.get("location")).toBe("/done");
		expect(tokenRequest!.headers.get("authorization")).toBe(`Basic ${btoa("123:telegram-secret")}`);
		const exchange = new URLSearchParams(await tokenRequest!.text());
		expect(exchange.get("code_verifier")).toBeTruthy();
		expect(createHash("sha256").update(exchange.get("code_verifier")!).digest("base64url")).toBe(
			url.searchParams.get("code_challenge")
		);
		expect(exchange.get("redirect_uri")).toBe(`${origin}/api/auth/oauth2/callback/telegram`);
		const userId = fixtures.db.user[0].id;
		expect(fixtures.db.account[0]).toMatchObject({
			userId,
			providerId: "telegram",
			accountId: "1234567"
		});
		expect(fixtures.db.user[0].emailVerified).toBe(false);
		await new Browser().login("telegram");
		expect(fixtures.db.user).toHaveLength(1);
		expect(fixtures.db.user[0].id).toBe(userId);
	});
	it("preserves legacy Discord email-matching migration, id and settings", async () => {
		fixtures.db.user.push({
			id: "legacy-user",
			name: "Legacy",
			email: `${discordId}@discord.internal`,
			emailVerified: true,
			discordId,
			userSettings: { theme: "dark" },
			createdAt: new Date(),
			updatedAt: new Date()
		});
		const response = await new Browser().login("discord");
		expect(response.headers.get("location")).toBe("/done");
		expect(fixtures.db.user).toHaveLength(1);
		expect(fixtures.db.user[0]).toMatchObject({
			id: "legacy-user",
			userSettings: { theme: "dark" }
		});
		expect(fixtures.db.account[0].userId).toBe("legacy-user");
	});
	it("rejects linking a legacy Discord identity before its first Better Auth sign-in", async () => {
		fixtures.db.user.push({
			id: "legacy-user",
			name: "Legacy",
			email: `${discordId}@discord.internal`,
			emailVerified: true,
			discordId,
			userSettings: { theme: "dark" },
			createdAt: new Date(),
			updatedAt: new Date()
		});
		const browser = new Browser();
		await browser.login("telegram");
		const result = await browser.finish("discord", await browser.begin("discord", true));
		expect(result.headers.get("location")).toContain("unable_to_link_account");
		expect(fixtures.db.account).toHaveLength(1);
		expect(fixtures.db.user.find((user) => user.id === "legacy-user").userSettings).toEqual({
			theme: "dark"
		});
		await new Browser().login("discord");
		expect(fixtures.db.account.find((account) => account.providerId === "discord")?.userId).toBe(
			"legacy-user"
		);
	});
	it.each(["discord", "telegram"] as const)(
		"explicit linking starting with %s yields the same user from both providers",
		async (first) => {
			const second = first === "discord" ? "telegram" : "discord";
			const browser = new Browser();
			await browser.login(first);
			const userId = fixtures.db.user[0].id;
			const response = await browser.finish(second, await browser.begin(second, true));
			expect(response.headers.get("location")).toBe("/done");
			expect(fixtures.db.account).toHaveLength(2);
			expect(fixtures.db.account.every((account) => account.userId === userId)).toBe(true);
			await new Browser().login(second);
			await new Browser().login(first);
			expect(fixtures.db.user).toHaveLength(1);
			expect(fixtures.db.session.every((session) => session.userId === userId)).toBe(true);
			// Native bearer sessions and Discord authorization remain available even
			// when the session was established via Telegram.
			const telegramBrowser = new Browser();
			await telegramBrowser.login("telegram");
			const token = fixtures.db.session.at(-1)!.token;
			const headers = new Headers({ authorization: `Bearer ${token}` });
			expect((await auth!.api.getSession({ headers }))?.user.id).toBe(userId);
			expect(
				(await auth!.api.getAccessToken({ headers, body: { providerId: "discord" } })).accessToken
			).toBe("discord-access-secret");
		}
	);
	it("never merges on a display name or unverified internal email", async () => {
		await new Browser().login("discord");
		await new Browser().login("telegram");
		expect(fixtures.db.user).toHaveLength(2);
		telegramId = 222;
		fixtures.db.user.push({
			id: "email-collision",
			email: "222@telegram.invalid",
			emailVerified: true,
			name: "Same display name",
			createdAt: new Date(),
			updatedAt: new Date()
		});
		const response = await new Browser().login("telegram");
		expect(response.headers.get("location")).toContain("account_not_linked");
		expect(fixtures.db.account.some((account) => account.accountId === "222")).toBe(false);
	});
	it.each(["discord", "telegram"] as const)(
		"rejects linking an existing %s identity belonging to another user",
		async (provider) => {
			const browser = new Browser();
			await browser.login(provider === "discord" ? "telegram" : "discord");
			await new Browser().login(provider);
			const response = await browser.finish(provider, await browser.begin(provider, true));
			expect(response.headers.get("location")).toContain(
				"account_already_linked_to_different_user"
			);
			expect(fixtures.db.user).toHaveLength(2);
			expect(fixtures.db.account[0].userId).not.toBe(fixtures.db.account[1].userId);
		}
	);
	it("rejects missing, cross-browser and replayed state", async () => {
		const browser = new Browser();
		const url = await browser.begin("telegram");
		await new Browser().finish("telegram", url);
		expect(fixtures.db.user).toHaveLength(0);
		const invalid = new URL(url);
		invalid.searchParams.set("state", "wrong");
		await browser.finish("telegram", invalid);
		expect(fixtures.db.user).toHaveLength(0);
		await browser.finish("telegram", url);
		const count = fixtures.db.session.length;
		await browser.finish("telegram", url);
		expect(fixtures.db.session).toHaveLength(count);
	});
	it("rejects invalid ID tokens and failed code/PKCE exchange without logging secrets", async () => {
		invalidToken = true;
		expect((await new Browser().login("telegram")).headers.get("location")).toContain(
			"user_info_is_missing"
		);
		expect(fixtures.db.user).toHaveLength(0);
		exchangeError = true;
		expect((await new Browser().login("telegram")).headers.get("location")).toContain(
			"oauth_code_verification_failed"
		);
		expect(fixtures.db.user).toHaveLength(0);
		expect(JSON.stringify(fixtures.logs.mock.calls)).not.toContain("secret");
	});
	it("rejects untrusted callback URLs and unauthenticated linking", async () => {
		const browser = new Browser();
		const response = await browser.request("/api/auth/sign-in/oauth2", {
			providerId: "telegram",
			callbackURL: "https://evil.example/done"
		});
		expect(response.status).toBe(403);
		expect(
			(
				await browser.request("/api/auth/oauth2/link", {
					providerId: "telegram",
					callbackURL: "/done"
				})
			).status
		).toBe(401);
	});
});
