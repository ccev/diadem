import { browser } from "$app/environment";
import { redirect } from "@sveltejs/kit";
import { setConfig } from "@/lib/services/config/config";
import { getMapPath } from "@/lib/utils/getMapPath";
import { getInstanceUrl, isNative } from "@/lib/native/runtime";
import {
	getDefaultUserSettings,
	setUserSettings,
	updateUserSettings
} from "@/lib/services/userSettings.svelte";
import type { LayoutLoad } from "./$types";

export const ssr = false;

export const load: LayoutLoad = async ({ fetch, url }) => {
	const nativeBuild = !browser && process.env.BUILD_TARGET === "native";

	// First run on native (no instance chosen yet): show the instance-gate screen.
	if ((isNative() || nativeBuild) && !getInstanceUrl()) {
		return { needsInstanceGate: true };
	}

	// show an error if instance isn't reachable
	let config;
	try {
		const configResponse = await fetch("/api/config");
		if (!configResponse.ok) throw new Error(`config ${configResponse.status}`);
		config = await configResponse.json();
	} catch {
		return { configError: true, offline: browser && !navigator.onLine };
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

	// no Home on native, redirect to map
	if (isNative()) {
		const mapPath = getMapPath(config);
		if (url.pathname === "/" && mapPath !== "/") {
			throw redirect(307, mapPath);
		}
	}
};
