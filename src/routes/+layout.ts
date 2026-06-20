import { browser } from "$app/environment";
import { redirect } from "@sveltejs/kit";
import { setConfig } from "@/lib/services/config/config";
import { getMapPath } from "@/lib/utils/getMapPath";
import { isNative } from "@/lib/native/runtime";
import {
	getDefaultUserSettings,
	setUserSettings,
	updateUserSettings
} from "@/lib/services/userSettings.svelte";
import type { LayoutLoad } from "./$types";

export const ssr = false;

export const load: LayoutLoad = async ({ fetch, url }) => {
	// If the instance is unreachable (offline, down, wrong URL), surface a retry
	// screen instead of crashing to a blank page — the whole native app depends
	// on the remote instance.
	let config;
	try {
		const configResponse = await fetch("/api/config");
		if (!configResponse.ok) throw new Error(`config ${configResponse.status}`);
		config = await configResponse.json();
	} catch {
		return { configError: true };
	}
	setConfig(config);

	let rawUserSettings: string | null = null;
	if (browser && window.localStorage) {
		rawUserSettings = localStorage.getItem("userSettings");
	}

	if (rawUserSettings) {
		setUserSettings(JSON.parse(rawUserSettings));
	} else {
		setUserSettings(getDefaultUserSettings());
	}

	updateUserSettings();

	// On native, never show the custom Home page — go straight to the map.
	if (isNative()) {
		const mapPath = getMapPath(config);
		if (url.pathname === "/" && mapPath !== "/") {
			throw redirect(307, mapPath);
		}
	}
};
