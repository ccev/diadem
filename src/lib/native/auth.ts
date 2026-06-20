import { getInstanceUrl, isNative } from "@/lib/native/runtime";

const TOKEN_KEY = "diadem_bearer_token";

// In-memory copy of the bearer token so nativeFetch can read it synchronously
// while building request headers. Persisted to Preferences across launches.
let bearerToken: string | null = null;

/** The current bearer session token, or null. Synchronous (for nativeFetch). */
export function getBearerToken(): string | null {
	return bearerToken;
}

/** Load the persisted bearer token into memory. Call once at boot, before fetches. */
export async function loadStoredToken(): Promise<void> {
	if (!isNative()) return;
	try {
		const { Preferences } = await import("@capacitor/preferences");
		const { value } = await Preferences.get({ key: TOKEN_KEY });
		bearerToken = value ?? null;
	} catch {
		bearerToken = null;
	}
}

async function persistToken(token: string | null): Promise<void> {
	bearerToken = token;
	try {
		const { Preferences } = await import("@capacitor/preferences");
		if (token) await Preferences.set({ key: TOKEN_KEY, value: token });
		else await Preferences.remove({ key: TOKEN_KEY });
	} catch {
		/* best effort */
	}
}

/**
 * Begin login: open the instance's OAuth flow in the system browser. The flow
 * ends by redirecting to diadem://auth?token=..., handled by the deep-link
 * listener which calls completeNativeLogin().
 */
export async function startNativeLogin(provider = "discord", redir = "/"): Promise<void> {
	const instance = getInstanceUrl();
	if (!instance) return;
	const url = `${instance}/login/${provider}?native=1&redir=${encodeURIComponent(redir)}`;
	const { Browser } = await import("@capacitor/browser");
	await Browser.open({ url });
}

/**
 * Validate the session token handed off via the deep link (using the bearer
 * plugin) and persist it. Returns true on success.
 */
export async function completeNativeLogin(token: string): Promise<boolean> {
	const instance = getInstanceUrl();
	if (!instance || !token) return false;
	try {
		const res = await fetch(`${instance}/api/auth/get-session`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		const data = (await res.json().catch(() => null)) as { user?: unknown } | null;
		const ok = res.ok && !!data?.user;
		console.log(`[auth] validate token status=${res.status} ok=${ok}`);
		if (!ok) return false;
		await persistToken(token);
		return true;
	} catch (e) {
		console.log(`[auth] validate threw: ${(e as Error)?.name}: ${(e as Error)?.message}`);
		return false;
	} finally {
		try {
			const { Browser } = await import("@capacitor/browser");
			await Browser.close();
		} catch {
			/* browser may already be closed */
		}
	}
}

/** Clear only the locally stored bearer token (server sign-out handled elsewhere). */
export async function clearStoredToken(): Promise<void> {
	await persistToken(null);
}

/** Clear the stored session and best-effort sign out on the server. */
export async function nativeLogout(): Promise<void> {
	const instance = getInstanceUrl();
	const token = bearerToken;
	await persistToken(null);
	if (instance && token) {
		try {
			await fetch(`${instance}/api/auth/sign-out`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` }
			});
		} catch {
			/* best effort */
		}
	}
}
