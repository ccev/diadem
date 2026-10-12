import { describe, expect, it, vi } from "vitest";
import { validateAuthConfig } from "./authProviders";
import type { Config } from "./configTypes";

function config(providers?: unknown) {
	return {
		client: providers === undefined ? {} : { auth: { providers, botToken: "discard-me" } },
		server: {
			auth: {
				enabled: true,
				discord: { clientId: "id", clientSecret: "discord-secret" },
				telegram: { clientId: "id", clientSecret: "telegram-secret", botToken: "bot-secret" }
			}
		}
	} as unknown as Config;
}

describe("auth configuration", () => {
	it("never serializes server credentials in the public config response", async () => {
		const value = config(["discord", "telegram"]);
		validateAuthConfig(value);
		vi.doMock("@/lib/services/config/config.server", () => ({
			getClientConfig: () => value.client
		}));
		const { GET } = await import("@/routes/api/config/+server");
		const response = await GET({
			request: new Request("https://map.example.test/api/config")
		} as Parameters<typeof GET>[0]);
		const text = await response.text();
		expect(text).toContain("telegram");
		for (const forbidden of [
			"bot-secret",
			"telegram-secret",
			"discord-secret",
			"clientSecret",
			"botToken"
		])
			expect(text).not.toContain(forbidden);
	});
	it("defaults to Discord without exposing credentials", () => {
		const value = config();
		validateAuthConfig(value);
		expect(value.client.auth?.providers).toEqual(["discord"]);
		expect(JSON.stringify(value.client)).not.toContain("secret");
	});
	it("supports Telegram-only and dual providers and allowlists public auth fields", () => {
		for (const providers of [["telegram"], ["discord", "telegram"]]) {
			const value = config(providers);
			validateAuthConfig(value);
			expect(value.client.auth).toEqual({ providers });
		}
	});
	it.each([[], ["unknown"], ["telegram", "telegram"], "telegram"])(
		"rejects invalid provider configuration %j",
		(providers) => {
			expect(() => validateAuthConfig(config(providers))).toThrow();
		}
	);
	it("rejects enabled providers without credentials and role-only rules", () => {
		const value = config(["telegram"]);
		delete value.server.auth.telegram;
		expect(() => validateAuthConfig(value)).toThrow();
		const rules = config();
		rules.server.permissions = [{ roleId: "role" }];
		expect(() => validateAuthConfig(rules)).toThrow("requires guildId");
	});
	it("rejects Telegram usernames and membership checks without a bot token", () => {
		const value = config();
		value.server.permissions = [{ telegramChatId: "@mutable" }];
		expect(() => validateAuthConfig(value)).toThrow();
		value.server.permissions = [{ telegramChatId: "-100123" }];
		delete value.server.auth.telegram!.botToken;
		expect(() => validateAuthConfig(value)).toThrow();
	});
});
