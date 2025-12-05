import {
	getDefaultUserSettings,
	setUserSettings,
	updateUserSettings
} from "@/lib/services/userSettings.svelte.js";
import { setConfig } from "@/lib/services/config/config";

export const ssr = false;

export const load = async ({ fetch }) => {
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
