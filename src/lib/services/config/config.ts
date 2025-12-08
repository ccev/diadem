import type { ClientConfig } from '@/lib/services/config/configTypes';

let config: ClientConfig

export function setConfig(newConfig: ClientConfig) {
	config = newConfig
}

export function getConfig() {
	return config
}
