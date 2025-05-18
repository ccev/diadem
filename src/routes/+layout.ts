import { initAllIconSets } from '@/lib/uicons.svelte';
import { loadMasterFile } from '@/lib/masterfile';
import {
	getDefaultUserSettings,
	getUserSettings,
	setUserSettings,
	updateUserSettings
} from '@/lib/userSettings.svelte';
import { browser } from '$app/environment';
import { setConfig } from '@/lib/config/config';
import { loadKojiGeofences } from '@/lib/koji';
import { loadRemoteLocale } from '@/lib/ingameLocale';
import { resolveLanguageTag } from '@/lib/i18n';
import { updateSupportedFeatures } from '@/lib/enabledFeatures';
import { updateUserDetails } from '@/lib/user/userDetails.svelte';

export const ssr = false;

export const load = async ({ fetch }) => {
	const configResponse = await fetch('/api/config');
	setConfig(await configResponse.json());

	await Promise.all([
		initAllIconSets(),
		loadMasterFile(),
		loadKojiGeofences(),
		updateSupportedFeatures(),
		updateUserDetails()
	]);

	if (browser) {
		const rawUserSettings = localStorage.getItem('userSettings');

		if (rawUserSettings) {
			setUserSettings(JSON.parse(rawUserSettings));
		} else {
			setUserSettings(getDefaultUserSettings());
			updateUserSettings();
		}

		await loadRemoteLocale(resolveLanguageTag(getUserSettings().languageTag));
	}
};
