import { initAllIconSets } from '@/lib/uicons.svelte';
import { loadMasterFile } from '@/lib/masterfile';
import { setUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
import { browser } from '$app/environment';

export const ssr = false

export const load = async () => {
	await Promise.all([initAllIconSets(), loadMasterFile()])

	if (browser) {
		const rawUserSettings = localStorage.getItem('userSettings')
		console.log(rawUserSettings)
		if (rawUserSettings) setUserSettings(JSON.parse(rawUserSettings))

		updateUserSettings()
	}
}