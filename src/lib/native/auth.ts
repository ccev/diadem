import { getInstanceUrl, isNative } from "@/lib/native/runtime";
import { Capacitor } from "@capacitor/core";

const TOKEN_KEY = "diadem_bearer_token";
type StoredToken = { instance: string; token: string };

// In-memory copy of the bearer token so nativeFetch can read it synchronously
// while building request headers. Persisted to Preferences across launches.
let storedToken: StoredToken | null = null;

/** The current bearer session token, or null. Synchronous (for nativeFetch). */
export function getBearerToken(): string | null {
	return storedToken?.instance === getInstanceUrl() ? storedToken.token : null;
}

/** Load the persisted bearer token into memory. Call once at boot, before fetches. */
export async function loadStoredToken(): Promise<void> {
	if (!isNative()) return;
	try {
		const { Preferences } = await import("@capacitor/preferences");
		const { value } = await Preferences.get({ key: TOKEN_KEY });
		let parsed: unknown = null;
		if (value) {
			try {
				parsed = JSON.parse(value);
			} catch {
				// Older APKs stored the raw token for the selected instance. Bind it
				// on upgrade so existing sessions survive the new storage format.
				parsed = { instance: getInstanceUrl(), token: value };
				await Preferences.set({ key: TOKEN_KEY, value: JSON.stringify(parsed) });
			}
		}
		storedToken =
			parsed &&
			typeof parsed === "object" &&
			"instance" in parsed &&
			parsed.instance === getInstanceUrl() &&
			"token" in parsed &&
			typeof parsed.token === "string" &&
			parsed.token
				? (parsed as StoredToken)
				: null;
	} catch {
		storedToken = null;
	}
}

async function persistToken(token: string | null, instance = getInstanceUrl()): Promise<void> {
	storedToken = token ? { instance, token } : null;
	try {
		const { Preferences } = await import("@capacitor/preferences");
		if (storedToken) await Preferences.set({ key: TOKEN_KEY, value: JSON.stringify(storedToken) });
		else await Preferences.remove({ key: TOKEN_KEY });
	} catch {
		/* best effort */
	}
}

const VERIFIER_KEY = "diadem_pkce_verifier";
type LoginAttempt = { verifier: string; instance: string; createdAt: number };
let pendingLogin: LoginAttempt | null = null;
let exchangeInFlight: Promise<boolean> | null = null;

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
async function storeVerifier(attempt: LoginAttempt | null): Promise<void> {
	pendingLogin = attempt;
	try {
		const { Preferences } = await import("@capacitor/preferences");
		if (attempt) await Preferences.set({ key: VERIFIER_KEY, value: JSON.stringify(attempt) });
		else await Preferences.remove({ key: VERIFIER_KEY });
	} catch {
		/* best effort */
	}
}

async function getLoginAttempt(): Promise<LoginAttempt | null> {
	if (pendingLogin) return pendingLogin;
	try {
		const { Preferences } = await import("@capacitor/preferences");
		const { value } = await Preferences.get({ key: VERIFIER_KEY });
		const parsed: unknown = value ? JSON.parse(value) : null;
		if (
			parsed &&
			typeof parsed === "object" &&
			"verifier" in parsed &&
			typeof parsed.verifier === "string" &&
			"instance" in parsed &&
			typeof parsed.instance === "string" &&
			"createdAt" in parsed &&
			typeof parsed.createdAt === "number"
		) {
			pendingLogin = parsed as LoginAttempt;
		}
		return pendingLogin;
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
	await storeVerifier({ verifier, instance, createdAt: Date.now() });
	const params = new URLSearchParams({ native: "1", redir, challenge });
	// Pass the app id so the callback can return via an intent:// URL targeting this
	// package directly — avoiding the browser's "open in app?" disambiguation prompt.
	try {
		if (Capacitor.getPlatform() === "android") {
			const { App } = await import("@capacitor/app");
			const id = (await App.getInfo()).id;
			if (id) params.set("app", id);
		}
	} catch {
		/* App.getInfo unavailable — fall back to the plain diadem:// scheme */
	}
	const url = `${instance}/login/${provider}?${params.toString()}`;
	try {
		const { Browser } = await import("@capacitor/browser");
		await Browser.open({ url });
	} catch {
		await storeVerifier(null);
		const { openToast } = await import("@/lib/ui/toasts.svelte");
		const { m } = await import("@/lib/paraglide/messages");
		openToast(m.signin_toast_error(), 10000);
	}
}

/**
 * Exchange the one-time code from the deep link (plus our stored PKCE verifier)
 * for the session token over HTTPS, then persist it. Returns true on success.
 */
export async function completeNativeLogin(code: string): Promise<boolean> {
	const instance = getInstanceUrl();
	if (!instance || !code) return false;
	if (exchangeInFlight) return exchangeInFlight;
	exchangeInFlight = (async () => {
		try {
			const attempt = await getLoginAttempt();
			if (
				!attempt ||
				attempt.instance !== instance ||
				Date.now() - attempt.createdAt > 30 * 60 * 1000
			)
				return false;
			const res = await fetch(`${instance}/api/native/exchange`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code, verifier: attempt.verifier }),
				signal: AbortSignal.timeout(15000)
			});
			const data = (await res.json().catch(() => null)) as { token?: unknown } | null;
			if (!res.ok || typeof data?.token !== "string" || !data.token) return false;
			if (getInstanceUrl() !== instance || pendingLogin !== attempt) return false;
			await persistToken(data.token, instance);
			await storeVerifier(null);
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
	})();
	try {
		return await exchangeInFlight;
	} finally {
		exchangeInFlight = null;
	}
}

/** Clear only the locally stored bearer token (server sign-out handled elsewhere). */
export async function clearStoredToken(): Promise<void> {
	await storeVerifier(null);
	await persistToken(null);
}

/** Clear the stored session and best-effort sign out on the server. */
export async function nativeLogout(): Promise<void> {
	const instance = getInstanceUrl();
	const token = getBearerToken();
	await clearStoredToken();
	if (instance) {
		try {
			await fetch(`${instance}/api/auth/sign-out`, {
				method: "POST",
				// Session refresh can also populate Capacitor's native cookie jar.
				// Better Auth requires a trusted Origin when those cookies are sent.
				headers: {
					Origin: window.location.origin,
					...(token ? { Authorization: `Bearer ${token}` } : {})
				}
			});
		} catch {
			/* best effort */
		}
	}
}
