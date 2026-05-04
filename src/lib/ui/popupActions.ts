import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export function isPopupExpanded(mapObject: MapObjectType | undefined) {
	if (!mapObject) return false;
	return getUserSettings().actions[mapObject].expanded;
}

export function togglePopupExpanded(mapObject: MapObjectType | undefined) {
	if (!mapObject) return;
	getUserSettings().actions[mapObject].expanded = !isPopupExpanded(mapObject);
	updateUserSettings();
}
