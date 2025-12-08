import type { LayoutLoad } from "./$types";
import { setConfig } from "@/lib/services/config/config";
import {
	getDefaultUserSettings,
	setUserSettings,
	updateUserSettings
} from "@/lib/services/userSettings.svelte";

export const load: LayoutLoad = async ({ fetch }) => {
	const configResponse = await fetch("/api/config");
	setConfig(await configResponse.json());

	const rawUserSettings = localStorage.getItem("userSettings");

	if (rawUserSettings) {
		setUserSettings(JSON.parse(rawUserSettings));
	} else {
		setUserSettings(getDefaultUserSettings());
	}

	updateUserSettings();
};
