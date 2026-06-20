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

const INSTANCE_KEY = "diadem_instance_url";

// In-memory copy of the configured instance origin so fetch wrappers can read it
// synchronously. Loaded once at boot from the build-time hardcode or Preferences.
let instanceUrl = "";

/**
 * A build-time hardcoded instance (branded single-instance app). When set, the
 * instance is fixed and the gate/instance-switcher are hidden.
 */
export function getHardcodedInstance(): string {
	const baked = import.meta.env.VITE_DIADEM_INSTANCE as string | undefined;
	return normalizeInstanceUrl(baked ?? "");
}

export function hasHardcodedInstance(): boolean {
	return Boolean(getHardcodedInstance());
}

/**
 * The remote Diadem instance the app talks to. "" on web/dev (relative
 * same-origin fetches) and until an instance is chosen on native.
 */
export function getInstanceUrl(): string {
	return instanceUrl;
}

/** Load the instance origin into memory at boot (hardcode wins, else Preferences). */
export async function loadInstanceUrl(): Promise<void> {
	if (!isNative()) {
		instanceUrl = "";
		return;
	}
	const hardcoded = getHardcodedInstance();
	if (hardcoded) {
		instanceUrl = hardcoded;
		return;
	}
	try {
		const { Preferences } = await import("@capacitor/preferences");
		const { value } = await Preferences.get({ key: INSTANCE_KEY });
		instanceUrl = normalizeInstanceUrl(value ?? "");
	} catch {
		instanceUrl = "";
	}
}

/**
 * Check a URL actually hosts a Diadem instance (its /api/config returns config).
 * Uses CapacitorHttp directly since the instance isn't configured yet.
 */
export async function validateInstance(url: string): Promise<boolean> {
	const normalized = normalizeInstanceUrl(url);
	if (!normalized) return false;
	try {
		const { CapacitorHttp } = await import("@capacitor/core");
		const res = await CapacitorHttp.request({
			url: `${normalized}/api/config`,
			method: "GET",
			headers: { "Accept-Encoding": "identity" }
		});
		if (res.status !== 200) return false;
		let config: unknown = res.data;
		if (typeof config === "string") {
			try {
				config = JSON.parse(config);
			} catch {
				return false;
			}
		}
		return !!config && typeof config === "object" && "general" in config;
	} catch {
		return false;
	}
}

/** Persist and apply a chosen instance origin (no-op when hardcoded). */
export async function setInstanceUrl(url: string): Promise<void> {
	if (hasHardcodedInstance()) return;
	instanceUrl = normalizeInstanceUrl(url);
	try {
		const { Preferences } = await import("@capacitor/preferences");
		if (instanceUrl) await Preferences.set({ key: INSTANCE_KEY, value: instanceUrl });
		else await Preferences.remove({ key: INSTANCE_KEY });
	} catch {
		/* best effort */
	}
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
