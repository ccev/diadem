import { getConfig } from '@/lib/services/config/config';
import {
	getUserSettings,
	updateUserSettings,
	type UserSettings
} from "@/lib/services/userSettings.svelte";
import { clearSessionImageUrls } from "@/lib/map/featuresManage.svelte";
import {
	deleteAllFeatures,
	deleteAllFeaturesOfType,
	updateFeatures
} from "@/lib/map/featuresGen.svelte";
import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte';
import type { MapObjectType } from '@/lib/types/mapObjectData/mapObjects';
import { getUiconSetDetails } from '@/lib/services/uicons.svelte';
import { tick } from "svelte";

export function onSettingsChange<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
	getUserSettings()[key] = value
	updateUserSettings()
}

export function onIconChange(iconSetId: string, iconType: MapObjectType) {
	const iconSet = getUiconSetDetails(iconSetId)
	if (!iconSet) return

	getUserSettings().uiconSet[iconType].id = iconSet.id
	getUserSettings().uiconSet[iconType].url = iconSet.url
	updateUserSettings()
	if (iconType === "pokemon") {
		// pretty much all features can have pokemon on them, so reset them all
		deleteAllFeatures()
	} else {
		deleteAllFeaturesOfType(iconType)
	}

	updateFeatures(getMapObjects())
}

export function onMapStyleChange(mapStyleId: string) {
	const mapStyle = getConfig().mapStyles.find(s => s.id === mapStyleId)
	if (!mapStyle) return

	getUserSettings().mapStyle.id = mapStyle.id
	getUserSettings().mapStyle.url = mapStyle.url
	updateUserSettings()
}