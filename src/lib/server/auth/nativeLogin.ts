import type { RequestEvent } from "@sveltejs/kit";

export type NativeLoginAttempt = { challenge: string; appId: string | null; redir: string };
const ATTEMPT_COOKIE = "diadem_native_login";
const COOKIE_PATH = "/login/discord";

export function storeNativeLoginAttempt(event: RequestEvent, attempt: NativeLoginAttempt): void {
	event.cookies.set(ATTEMPT_COOKIE, JSON.stringify(attempt), {
		path: COOKIE_PATH,
		httpOnly: true,
		secure: event.url.protocol === "https:",
		sameSite: "lax",
		maxAge: 30 * 60
	});
}

/** Bind the handoff to the OAuth flow, rather than any existing browser session. */
export function consumeNativeLoginAttempt(
	event: RequestEvent,
	attempt: NativeLoginAttempt
): boolean {
	if (event.cookies.get(ATTEMPT_COOKIE) !== JSON.stringify(attempt)) return false;
	event.cookies.delete(ATTEMPT_COOKIE, { path: COOKIE_PATH });
	return true;
}

export function nativeReturnUrl(suffix: string, appId: string | null): string {
	if (appId && /^[a-zA-Z0-9._]+$/.test(appId)) {
		return `intent://${suffix}#Intent;scheme=diadem;package=${appId};end`;
	}
	return `diadem://${suffix}`;
}
