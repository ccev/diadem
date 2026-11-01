import { Capacitor } from "@capacitor/core";
import { decode } from "@msgpack/msgpack";
import { requestNativeHttp } from "@/lib/native/httpRequest";
import { capacitorResponseBytes } from "@/lib/native/httpResponse";

export function isNative(): boolean {
	return Capacitor.isNativePlatform();
}

/** Accept a hostname or pasted map URL and retain its HTTP(S) origin. */
export function normalizeInstanceUrl(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return "";
	try {
		const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
		if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) {
			return "";
		}
		return parsed.origin;
	} catch {
		return "";
	}
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

/**
 * Probe a candidate instance before configuring it. Decode the actual response
 * type: instances and intermediary caches can return either JSON or MessagePack.
 */
export async function fetchInstanceMapName(url: string): Promise<string | null> {
	const normalized = normalizeInstanceUrl(url);
	if (!normalized) return null;
	try {
		const res = await requestNativeHttp({
			url: `${normalized}/api/config`,
			method: "GET",
			headers: { Accept: "application/json", "Accept-Encoding": "identity" },
			responseType: "blob"
		});
		if (res.status !== 200) return null;
		const contentType = new Headers(res.headers).get("content-type")?.split(";", 1)[0].trim();
		const bytes = capacitorResponseBytes(res.data, contentType, res.status);
		const config: unknown =
			contentType?.toLowerCase() === "application/msgpack"
				? decode(bytes)
				: JSON.parse(new TextDecoder().decode(bytes));
		if (!config || typeof config !== "object" || !("general" in config)) return null;
		const general = config.general;
		if (!general || typeof general !== "object" || !("mapName" in general)) return null;
		return typeof general.mapName === "string" && general.mapName.trim() ? general.mapName : null;
	} catch {
		return null;
	}
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
