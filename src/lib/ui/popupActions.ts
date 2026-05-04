import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import {
	updateDimmedFeatures,
	updateRadiusFeatures
} from "@/lib/map/featuresGen.svelte";

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
	if ("all" in actionState && actionState.all) return !actionState.mapIds.includes(mapId);

	return actionState.mapIds.includes(mapId);
}

export function togglePopupAction(
	mapObject: MapObjectType | undefined,
	mapId: string | undefined,
	action: PopupAction
) {
	if (!mapObject || !mapId || !supportsPopupAction(mapObject, action)) return;

	const actionState = getUserSettings().actions[mapObject][action];
	if (actionState.mapIds.includes(mapId)) {
		actionState.mapIds = actionState.mapIds.filter((id) => id !== mapId);
	} else {
		actionState.mapIds.push(mapId);
	}

	if (action === "dimmed") {
		const timerState = getUserSettings().actions[mapObject].timer;
		if ("all" in timerState && timerState.all) {
			const nowDimmed = actionState.mapIds.includes(mapId);
			if (nowDimmed && !timerState.mapIds.includes(mapId)) {
				timerState.mapIds.push(mapId);
			} else if (!nowDimmed) {
				timerState.mapIds = timerState.mapIds.filter((id) => id !== mapId);
			}
		}
	}

	updateUserSettings();
	if (action === "dimmed") updateDimmedFeatures();
	if (action === "radius") updateRadiusFeatures();
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
	actionState.mapIds = [];
	updateUserSettings();
	if (action === "radius") updateRadiusFeatures();
}

export function clearPopupAction(mapObject: MapObjectType | undefined, action: PopupAction) {
	if (!mapObject || !supportsPopupAction(mapObject, action)) return;

	const actionState = getUserSettings().actions[mapObject][action];
	actionState.mapIds = [];
	if ("all" in actionState) actionState.all = false;

	updateUserSettings();
	if (action === "dimmed") updateDimmedFeatures();
	if (action === "radius") updateRadiusFeatures();
}

export function isExtraRadiusActive(mapObject: MapObjectType | undefined) {
	if (!mapObject || !supportsPopupAction(mapObject, "radius")) return false;
	return getUserSettings().actions[mapObject].radius.extraRadius;
}

export function toggleExtraRadius(mapObject: MapObjectType | undefined, mapId?: string) {
	if (!mapObject || !supportsPopupAction(mapObject, "radius")) return;

	const radiusState = getUserSettings().actions[mapObject].radius;
	radiusState.extraRadius = !radiusState.extraRadius;

	if (radiusState.extraRadius && mapId && !isPopupActionActive(mapObject, mapId, "radius")) {
		if (radiusState.all) {
			radiusState.mapIds = radiusState.mapIds.filter((id) => id !== mapId);
		} else {
			radiusState.mapIds.push(mapId);
		}
	}

	updateUserSettings();
	updateRadiusFeatures();
}
