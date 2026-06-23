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

const VERIFIER_KEY = "diadem_pkce_verifier";

function base64url(bytes: Uint8Array): string {
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Create a PKCE verifier/challenge pair. The verifier is kept on-device; only
 * the challenge (sha256, base64url) is sent to the server, so a hijacked deep
 * link can't be exchanged without the verifier.
 */
async function createPkce(): Promise<{ verifier: string; challenge: string }> {
	const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
	return { verifier, challenge: base64url(new Uint8Array(digest)) };
}

// Persisted so the verifier survives if the app is evicted while the system
// browser is in the foreground (cold-start deep link).
async function storeVerifier(verifier: string): Promise<void> {
	try {
		const { Preferences } = await import("@capacitor/preferences");
		await Preferences.set({ key: VERIFIER_KEY, value: verifier });
	} catch {
		/* best effort */
	}
}

async function takeVerifier(): Promise<string | null> {
	try {
		const { Preferences } = await import("@capacitor/preferences");
		const { value } = await Preferences.get({ key: VERIFIER_KEY });
		await Preferences.remove({ key: VERIFIER_KEY });
		return value ?? null;
	} catch {
		return null;
	}
}

/**
 * Begin login: open the instance's OAuth flow in the system browser. The flow
 * ends by redirecting to diadem://auth?code=..., handled by the deep-link
 * listener which calls completeNativeLogin() to exchange the code for the token.
 */
export async function startNativeLogin(provider = "discord", redir = "/"): Promise<void> {
	const instance = getInstanceUrl();
	if (!instance) return;
	const { verifier, challenge } = await createPkce();
	await storeVerifier(verifier);
	const params = new URLSearchParams({ native: "1", redir, challenge });
	// Pass the app id so the callback can return via an intent:// URL targeting this
	// package directly — avoiding the browser's "open in app?" disambiguation prompt.
	try {
		const { App } = await import("@capacitor/app");
		const id = (await App.getInfo()).id;
		if (id) params.set("app", id);
	} catch {
		/* App.getInfo unavailable — fall back to the plain diadem:// scheme */
	}
	const url = `${instance}/login/${provider}?${params.toString()}`;
	const { Browser } = await import("@capacitor/browser");
	await Browser.open({ url });
}

/**
 * Exchange the one-time code from the deep link (plus our stored PKCE verifier)
 * for the session token over HTTPS, then persist it. Returns true on success.
 */
export async function completeNativeLogin(code: string): Promise<boolean> {
	const instance = getInstanceUrl();
	if (!instance || !code) return false;
	try {
		const verifier = await takeVerifier();
		if (!verifier) return false;
		const res = await fetch(`${instance}/api/native/exchange`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ code, verifier })
		});
		const data = (await res.json().catch(() => null)) as { token?: unknown } | null;
		if (!res.ok || typeof data?.token !== "string" || !data.token) return false;
		await persistToken(data.token);
		return true;
	} catch {
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
