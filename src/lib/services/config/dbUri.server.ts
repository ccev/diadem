import type { DbCreds } from './configTypes';

export function getDbUri(creds: DbCreds) {
	return `mysql://${creds.user}:${creds.password}@${creds.host}:${creds.port}/${creds.database}`;
}