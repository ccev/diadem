import type { AuthProvider, Config } from "./configTypes";

export const defaultAuthProviders: AuthProvider[] = ["discord"];

export function validateAuthConfig(config: Config) {
	const providers = config.client.auth?.providers ?? [...defaultAuthProviders];
	if (
		!Array.isArray(providers) ||
		!providers.length ||
		new Set(providers).size !== providers.length ||
		providers.some((provider) => provider !== "discord" && provider !== "telegram")
	) {
		throw new Error(
			"client.auth.providers must contain unique supported providers: discord, telegram"
		);
	}
	// Reconstruct this public section: never spread server auth credentials into it.
	config.client.auth = { providers };
	if (config.server.auth.enabled) {
		for (const provider of providers) {
			const credentials = config.server.auth[provider];
			if (
				typeof credentials?.clientId !== "string" ||
				!credentials.clientId.trim() ||
				typeof credentials.clientSecret !== "string" ||
				!credentials.clientSecret.trim()
			) {
				throw new Error(`Missing server.auth.${provider} OAuth configuration`);
			}
		}
	}
	for (const rule of config.server.permissions ?? []) {
		if (rule.roleId && !rule.guildId) throw new Error("Permission roleId requires guildId");
		if (rule.telegramChatId !== undefined) {
			if (typeof rule.telegramChatId !== "string" || !/^-?[1-9]\d*$/.test(rule.telegramChatId)) {
				throw new Error("telegramChatId must be a stable numeric chat ID string, not a username");
			}
			if (config.server.auth.enabled && !config.server.auth.telegram?.botToken) {
				throw new Error("Telegram permission rules require server.auth.telegram.botToken");
			}
		}
	}
}
