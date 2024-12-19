import { parse } from 'toml';
import type { Config } from '@/lib/types/config';
import { env } from '$env/dynamic/private';
import type { Asset } from '@sveltejs/kit/src/types/internal';

let config: Config;

export async function readConfig() {
	let rawToml: string = '';
	let configFile

	configFile = await import('./server/config.toml?raw')
	rawToml = configFile.default

	config = parse(rawToml);
	return config.client;
}

export function getServerConfig() {
	return config.server;
}
