import type { DbCreds } from '@/lib/config/config.d';

export function getDbUri(creds: DbCreds) {
	return `mysql://${creds.user}:${creds.password}@${creds.host}:${creds.port}/${creds.database}`;
}