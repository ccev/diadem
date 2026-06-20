import { Capacitor } from "@capacitor/core";

/** True only inside a Capacitor native shell (iOS/Android), false in any browser. */
export function isNative(): boolean {
	return Capacitor.isNativePlatform();
}

/** Normalize a user/instance URL: trim, add https:// if no scheme, drop trailing slash. */
export function normalizeInstanceUrl(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return "";
	const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	return withScheme.replace(/\/+$/, "");
}

/**
 * The remote Diadem instance the app talks to.
 * Plan 1: build-time hardcode via VITE env (set to https://demap.co for testing).
 * Later plan: fall back to a value stored via the instance-gate screen.
 * Returns "" on web/dev so relative same-origin fetches are used unchanged.
 */
export function getInstanceUrl(): string {
	if (!isNative()) return "";
	const baked = import.meta.env.VITE_DIADEM_INSTANCE as string | undefined;
	return normalizeInstanceUrl(baked ?? "");
}

/**
 * Origin to use in user-shareable URLs. On native the webview origin is
 * https://localhost, which is useless to share — use the instance origin
 * instead. On web this is just the page origin.
 */
export function getPublicOrigin(): string {
	return getInstanceUrl() || window.location.origin;
}

/** Rewrite a same-origin app URL so it points at the shareable instance origin. */
export function toPublicUrl(href: string): string {
	const instance = getInstanceUrl();
	if (!instance) return href;
	try {
		const u = new URL(href, window.location.origin);
		return `${instance}${u.pathname}${u.search}${u.hash}`;
	} catch {
		return href;
	}
}
