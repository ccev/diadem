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
