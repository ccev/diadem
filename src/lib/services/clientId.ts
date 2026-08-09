import { browser } from "$app/environment";
import { getId } from "@/lib/utils/uuid";

/**
 * A random id identifying this browser to the server, so per-client state — the
 * filter cache — isn't shared with everyone else behind the same address. It is
 * not an identity and nothing is authorized by it.
 *
 * Kept in sessionStorage so a reload reuses it. A fresh id per page load would
 * orphan a full set of cache entries for their whole lifetime on every reload,
 * filling the cache with keys nobody will ever read again.
 */
const STORAGE_KEY = "diadem_client_id";

/**
 * What the server will accept as an id. Defined here and imported there, so the
 * two cannot drift: an id the server rejects is silently ignored, and every
 * logged-out visitor behind a proxy collapses onto one cache key — the exact
 * thing this id exists to prevent.
 */
export const CLIENT_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

let clientId: string | undefined;

export function getClientId(): string {
	if (clientId) return clientId;

	if (browser) {
		try {
			const stored = sessionStorage.getItem(STORAGE_KEY);
			// Validated, not trusted: anything else on the origin can write here.
			if (stored && CLIENT_ID_PATTERN.test(stored)) return (clientId = stored);
		} catch {
			// Storage can be unavailable or full; an in-memory id still works.
		}
	}

	clientId = getId();
	if (browser) {
		try {
			sessionStorage.setItem(STORAGE_KEY, clientId);
		} catch {
			// As above — losing persistence only costs a cache entry per reload.
		}
	}
	return clientId;
}
