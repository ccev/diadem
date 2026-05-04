import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export function isPopupExpanded(mapObject: MapObjectType | undefined) {
	if (!mapObject) return false;
	return getUserSettings().expandedMapObjects.includes(mapObject);
}

export function togglePopupExpanded(mapObject: MapObjectType | undefined) {
	if (!mapObject) return;
	if (isPopupExpanded(mapObject)) {
		getUserSettings().expandedMapObjects = getUserSettings().expandedMapObjects.filter(
			(m) => m !== mapObject
		);
	} else {
		getUserSettings().expandedMapObjects.push(mapObject);
	}
	updateUserSettings();
}
