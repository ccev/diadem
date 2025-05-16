import { parse } from 'toml';
import type { Config } from '@/lib/types/config';

let config: Config;

export async function readConfig() {
	const configFile = await import('./server/config.toml?raw');
	config = parse(configFile.default);
	return config.client;
}

export function isConfigInitialized() {
	return Boolean(config)
}

export function getServerConfig() {
	return config.server;
}
