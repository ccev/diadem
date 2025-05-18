import { Discord } from 'arctic';
import { getServerConfig } from '@/lib/config/config.server';

const config = getServerConfig().auth.discord;
export const IS_DISCORD_ENABLED: boolean = !!config && !!config.clientId && !!config.clientSecret && !!config.redirectUri

export function getDiscordAuth() {
	if (!IS_DISCORD_ENABLED) return

	if (config) return new Discord(config.clientId, config.clientSecret, config.redirectUri)
}