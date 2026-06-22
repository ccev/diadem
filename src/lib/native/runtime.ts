import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
	return Capacitor.isNativePlatform();
}

/** Normalize an instance URL: trim, add https:// if no scheme, drop trailing slash. */
export function normalizeInstanceUrl(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return "";
	const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	return withScheme.replace(/\/+$/, "");
}

const INSTANCE_KEY = "diadem_instance_url";

let instanceUrl = "";
let instanceUrlBaked: boolean = false;

export function isInstanceUrlBaked(): boolean {
	return instanceUrlBaked;
}

export function getInstanceUrl(): string {
	return instanceUrl;
}

/** Load the instance origin into memory at boot (hardcode wins, else Preferences). */
export async function loadInstanceUrl(): Promise<void> {
	if (!isNative()) {
		instanceUrl = "";
		return;
	}

	const baked = normalizeInstanceUrl(import.meta.env.VITE_DIADEM_INSTANCE as string | undefined ?? "");
	if (baked) {
		instanceUrl = baked;
		instanceUrlBaked = true
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
	if (instanceUrlBaked) return;
	instanceUrl = normalizeInstanceUrl(url);
	try {
		const { Preferences } = await import("@capacitor/preferences");
		if (instanceUrl) await Preferences.set({ key: INSTANCE_KEY, value: instanceUrl });
		else await Preferences.remove({ key: INSTANCE_KEY });
	} catch {
		/* best effort */
	}
}

export function getRootOrigin(): string {
	return getInstanceUrl() || window.location.origin;
}
