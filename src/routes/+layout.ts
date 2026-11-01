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
import type { ClientConfig } from "@/lib/services/config/configTypes";
import { getHeaders, parseResponse } from "@/lib/utils/requests";

export const ssr = false;

export const load: LayoutLoad = async ({ fetch, url, route, untrack }) => {
	// OAuth reaches this page by a full browser navigation. Don't make ordinary
	// client-side route changes rerun the application bootstrap.
	if (untrack(() => route.id === "/(auth)/login/discord/native")) {
		return { nativeAuthHandoff: true };
	}
	if (!browser) return;

	// First run on native (no instance chosen yet): show the instance-gate screen.
	if (isNative() && !getInstanceUrl()) {
		return { needsInstanceGate: true };
	}

	// show an error if instance isn't reachable
	let config: ClientConfig;
	try {
		const configResponse = await fetch("/api/config", { headers: getHeaders() });
		if (!configResponse.ok) throw new Error(`config ${configResponse.status}`);
		config = await parseResponse<ClientConfig>(configResponse);
	} catch {
		return { configError: true, offline: browser && !navigator.onLine };
	}
	setConfig(config);

	try {
		const rawUserSettings = window.localStorage?.getItem("userSettings");
		const savedSettings: unknown = rawUserSettings ? JSON.parse(rawUserSettings) : null;
		setUserSettings(
			savedSettings && typeof savedSettings === "object" && !Array.isArray(savedSettings)
				? savedSettings
				: getDefaultUserSettings()
		);
	} catch {
		// A corrupt saved value must not prevent the map from starting.
		setUserSettings(getDefaultUserSettings());
	}

	updateUserSettings();

	// Redirect the initial native landing page without tracking later navigation.
	if (isNative()) {
		const mapPath = getMapPath(config);
		if (untrack(() => url.pathname === "/") && mapPath !== "/") {
			throw redirect(307, mapPath);
		}
	}
};
