import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { updateDimmed } from "@/lib/map/featuresGen.svelte";

export type PopupAction = "dimmed" | "radius" | "timer";

const supportedPopupActions: Partial<Record<MapObjectType, PopupAction[]>> = {
	[MapObjectType.POKEMON]: ["dimmed", "radius", "timer"]
};

export function supportsPopupAction(mapObject: MapObjectType | undefined, action: PopupAction) {
	if (!mapObject) return false;
	return supportedPopupActions[mapObject]?.includes(action) ?? false;
}

export function isPopupExpanded(mapObject: MapObjectType | undefined) {
	if (!mapObject) return false;
	return getUserSettings().actions[mapObject].expanded;
}

export function togglePopupExpanded(mapObject: MapObjectType | undefined) {
	if (!mapObject) return;
	getUserSettings().actions[mapObject].expanded = !isPopupExpanded(mapObject);
	updateUserSettings();
}

export function isPopupActionActive(
	mapObject: MapObjectType | undefined,
	mapId: string | undefined,
	action: PopupAction
) {
	if (!mapObject || !mapId || !supportsPopupAction(mapObject, action)) return false;

	const actionState = getUserSettings().actions[mapObject][action];
	if ("all" in actionState && actionState.all) return true;

	return actionState.mapIds.includes(mapId);
}

export function togglePopupAction(
	mapObject: MapObjectType | undefined,
	mapId: string | undefined,
	action: PopupAction
) {
	if (!mapObject || !mapId || !supportsPopupAction(mapObject, action)) return;

	const actionState = getUserSettings().actions[mapObject][action];
	if ("all" in actionState && actionState.all) {
		actionState.all = false;
		updateUserSettings();
		if (action === "dimmed") updateDimmed();
		return;
	}

	if (actionState.mapIds.includes(mapId)) {
		actionState.mapIds = actionState.mapIds.filter((id) => id !== mapId);
	} else {
		actionState.mapIds.push(mapId);
	}

	updateUserSettings();
	if (action === "dimmed") updateDimmed();
}

export function isPopupActionAllActive(mapObject: MapObjectType | undefined, action: PopupAction) {
	if (!mapObject || !supportsPopupAction(mapObject, action)) return false;

	const actionState = getUserSettings().actions[mapObject][action];
	return "all" in actionState ? actionState.all : false;
}

export function togglePopupActionAll(mapObject: MapObjectType | undefined, action: PopupAction) {
	if (!mapObject || !supportsPopupAction(mapObject, action)) return;

	const actionState = getUserSettings().actions[mapObject][action];
	if (!("all" in actionState)) return;

	actionState.all = !actionState.all;
	updateUserSettings();
}

export function clearPopupAction(mapObject: MapObjectType | undefined, action: PopupAction) {
	if (!mapObject || !supportsPopupAction(mapObject, action)) return;

	const actionState = getUserSettings().actions[mapObject][action];
	actionState.mapIds = [];
	if ("all" in actionState) actionState.all = false;

	updateUserSettings();
	if (action === "dimmed") updateDimmed();
}

export function isExtraRadiusActive(mapObject: MapObjectType | undefined) {
	if (!mapObject || !supportsPopupAction(mapObject, "radius")) return false;
	return getUserSettings().actions[mapObject].radius.extraRadius;
}

export function toggleExtraRadius(mapObject: MapObjectType | undefined) {
	if (!mapObject || !supportsPopupAction(mapObject, "radius")) return;

	const radiusState = getUserSettings().actions[mapObject].radius;
	radiusState.extraRadius = !radiusState.extraRadius;
	updateUserSettings();
}
