import { setConfig } from '@/lib/config/config';
import { initAllIconSets } from '@/lib/uicons.svelte';
import { loadMasterFile } from '@/lib/masterfile';
import { loadKojiGeofences } from '@/lib/koji';
import { updateSupportedFeatures } from '@/lib/enabledFeatures';
import { getUserDetails, updateUserDetails } from '@/lib/user/userDetails.svelte';
import { browser } from '$app/environment';
import {
	getDefaultUserSettings, getUserSettings,
	getUserSettingsFromServer,
	setUserSettings,
	updateUserSettings
} from '@/lib/userSettings.svelte';
import { loadRemoteLocale } from '@/lib/ingameLocale';
import { resolveLanguageTag } from '@/lib/i18n';

export enum LoadedFeature {
	ICON_SETS = "iconSets",
	MASTER_FILE = "masterFile",
	KOJI = "koji",
	SUPPORTED_FEATURES = "supportedFeatures",
	USER_DETAILS = "userDetails",
	REMOTE_LOCALE = "remoteLocale",
	SERVER_USER_SETTINGS = "serverUserSettings"
}

let loadedFeatures: LoadedFeature[] = $state([])

export function getIsLoading() {
	return getLoadingProgress() < 1
}

export function hasLoadedFeature(feature: LoadedFeature) {
	return loadedFeatures.includes(feature)
}

/**
 * Get current loading progress (range 0-1)
 */
export function getLoadingProgress(offset: number = 0) {
	return (loadedFeatures.length + offset) / Object.keys(LoadedFeature).length
}

async function loadingWrapper<T>(func: Promise<T>, loadedFeature: LoadedFeature): Promise<T> {
	const result = await func
	loadedFeatures.push(loadedFeature)
	return result
}

export async function load() {
	await Promise.all([
		loadingWrapper(initAllIconSets(), LoadedFeature.ICON_SETS),
		loadingWrapper(loadMasterFile(), LoadedFeature.MASTER_FILE),
		loadingWrapper(loadKojiGeofences(), LoadedFeature.KOJI),
		loadingWrapper(updateSupportedFeatures(), LoadedFeature.SUPPORTED_FEATURES),
		loadingWrapper(updateUserDetails(), LoadedFeature.USER_DETAILS),
		loadingWrapper(loadRemoteLocale(resolveLanguageTag(getUserSettings().languageTag)), LoadedFeature.REMOTE_LOCALE),
	]);

	if (browser) {
		if (getUserDetails().details) {
			await getUserSettingsFromServer()
		}

		await loadRemoteLocale(resolveLanguageTag(getUserSettings().languageTag));
	}

	loadedFeatures.push(LoadedFeature.SERVER_USER_SETTINGS)
}