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

	const baked = normalizeInstanceUrl(
		(import.meta.env.VITE_DIADEM_INSTANCE as string | undefined) ?? ""
	);
	if (baked) {
		instanceUrl = baked;
		instanceUrlBaked = true;
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

type InstanceConfig = { general?: { mapName?: string } };

/**
 * Fetch a candidate instance's /api/config and return it if it looks like a
 * Diadem instance (has `general`), else null. Uses CapacitorHttp directly since
 * the instance isn't configured yet.
 */
async function fetchInstanceConfig(url: string): Promise<InstanceConfig | null> {
	const normalized = normalizeInstanceUrl(url);
	if (!normalized) return null;
	try {
		const { CapacitorHttp } = await import("@capacitor/core");
		const res = await CapacitorHttp.request({
			url: `${normalized}/api/config`,
			method: "GET",
			headers: { "Accept-Encoding": "identity" }
		});
		if (res.status !== 200) return null;
		let config: unknown = res.data;
		if (typeof config === "string") {
			try {
				config = JSON.parse(config);
			} catch {
				return null;
			}
		}
		if (!config || typeof config !== "object" || !("general" in config)) return null;
		return config as InstanceConfig;
	} catch {
		return null;
	}
}

export async function fetchInstanceMapName(url: string): Promise<string | null> {
	const config = await fetchInstanceConfig(url);
	return config?.general?.mapName ?? null;
}

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
