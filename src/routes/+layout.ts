import { initAllIconSets } from '@/lib/uicons.svelte';
import { loadMasterFile } from '@/lib/masterfile';
import { getDefaultUserSettings, setUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
import { browser } from '$app/environment';
import { setConfig } from '@/lib/config';
import { loadKojiGeofences } from '@/lib/koji';

export const ssr = false

export const load = async ({fetch}) => {
	const configResponse = await fetch("/api/config")
	setConfig(await configResponse.json())

	await Promise.all([initAllIconSets(), loadMasterFile(), loadKojiGeofences()])

	if (browser) {
		const rawUserSettings = localStorage.getItem('userSettings')

		if (rawUserSettings) {
			setUserSettings(JSON.parse(rawUserSettings))
		} else {
			setUserSettings(getDefaultUserSettings())
			updateUserSettings()
		}
	}
}