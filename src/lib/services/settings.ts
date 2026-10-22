import {
	deleteAllFeatures,
	deleteAllFeaturesOfType,
	updateFeatures
} from "@/lib/map/featuresGen.svelte";
import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

import { getConfig } from "@/lib/services/config/config";
import { getUiconSetDetails } from "@/lib/services/uicons.svelte";
import {
	ExternalMapProvider,
	getUserSettings,
	updateUserSettings,
	type UserSettings
} from "@/lib/services/userSettings.svelte";

export const getAvailableLanguages = () => [
	{
		label: "English",
		value: "en"
	},
	{
		label: "German",
		value: "de"
	},
	{
		label: "Spanish",
		value: "es"
	},
	{
		label: "Portuguese",
		value: "pt"
	},
	{
		label: "Polish",
		value: "pl"
	}
];

export const getAvailableMapProviders = () => [
	{
		label: "Google Maps",
		value: ExternalMapProvider.GOOGLE
	},
	{
		label: "Apple Maps",
		value: ExternalMapProvider.APPLE
	}
];

export function onSettingsChange<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
	getUserSettings()[key] = value;
	updateUserSettings();
}

export function onIconChange(iconSetId: string, iconType: MapObjectType) {
	const iconSet = getUiconSetDetails(iconSetId);
	if (!iconSet) return;

	(getUserSettings().uiconSet as Record<string, { id: string; url: string }>)[iconType].id =
		iconSet.id;
	(getUserSettings().uiconSet as Record<string, { id: string; url: string }>)[iconType].url =
		iconSet.url;
	updateUserSettings();
	if (iconType === "pokemon") {
		// pretty much all features can have pokemon on them, so reset them all
		deleteAllFeatures();
	} else {
		deleteAllFeaturesOfType(iconType);
	}

	updateFeatures(getMapObjects());
}

export function onMapStyleChange(mapStyleId: string) {
	const mapStyle = getConfig().mapStyles.find((s) => s.id === mapStyleId);
	if (!mapStyle) return;

	getUserSettings().mapStyle.id = mapStyle.id;
	getUserSettings().mapStyle.url = mapStyle.url;
	updateUserSettings();
}
