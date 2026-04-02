import { initAllIconSets } from "@/lib/services/uicons.svelte.js";
import { loadMasterFile } from "@/lib/services/masterfile";
import { loadKojiGeofences } from "@/lib/features/koji";
import { updateSupportedFeatures } from "@/lib/services/supportedFeatures";
import { getUserDetails, updateUserDetails } from "@/lib/services/user/userDetails.svelte.js";
import { browser } from "$app/environment";
import { getUserSettings, getUserSettingsFromServer } from "@/lib/services/userSettings.svelte.js";
import { loadRemoteLocale } from "@/lib/services/ingameLocale";
import { loadMasterStats } from "@/lib/features/masterStats.svelte";
import { getLocale } from "@/lib/paraglide/runtime";

export enum LoadedFeature {
	ICON_SETS = "iconSets",
	MASTER_FILE = "masterFile",
	KOJI = "koji",
	SUPPORTED_FEATURES = "supportedFeatures",
	USER_DETAILS = "userDetails",
	REMOTE_LOCALE = "remoteLocale",
	SERVER_USER_SETTINGS = "serverUserSettings",
	MASTER_STATS = "masterStats"
}

let loadedFeatures: LoadedFeature[] = $state([]);

export function getIsLoading() {
	return getLoadingProgress() < 1;
}

/**
 * Checks whether certain parts have been loaded, is reactive
 * @param features
 */
export function hasLoadedFeature(...features: LoadedFeature[]) {
	for (const feature of features) {
		if (!loadedFeatures.includes(feature)) return false;
	}
	return true;
}

/**
 * Get current loading progress (range 0-1)
 */
export function getLoadingProgress(offset: number = 0) {
	return (loadedFeatures.length + offset) / Object.keys(LoadedFeature).length;
}

async function loadingWrapper<T>(func: Promise<T>, loadedFeature: LoadedFeature): Promise<T> {
	const result = await func;
	loadedFeatures.push(loadedFeature);
	return result;
}

export async function load() {
	await Promise.all([
		loadingWrapper(initAllIconSets(), LoadedFeature.ICON_SETS),
		loadingWrapper(loadMasterFile(), LoadedFeature.MASTER_FILE),
		loadingWrapper(loadKojiGeofences(), LoadedFeature.KOJI),
		loadingWrapper(updateSupportedFeatures(), LoadedFeature.SUPPORTED_FEATURES),
		loadingWrapper(loadMasterStats(), LoadedFeature.MASTER_STATS),
		loadingWrapper(updateUserDetails(), LoadedFeature.USER_DETAILS),
		loadingWrapper(loadRemoteLocale(getLocale()), LoadedFeature.REMOTE_LOCALE)
	]);

	if (browser) {
		if (getUserDetails().details) {
			await getUserSettingsFromServer();
		}

		await loadRemoteLocale(getLocale());
	}

	loadedFeatures.push(LoadedFeature.SERVER_USER_SETTINGS);
}
