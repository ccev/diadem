import { updateDimmedFeatures, updateRadiusFeatures } from "@/lib/map/featuresGen.svelte";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import * as m from "@/lib/paraglide/messages";
import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
import type { LucideIcon } from "@/lib/types/lucide";
import { mAny } from "@/lib/utils/anyMessage";
import { Expand, Eye, SquareStack } from "lucide-svelte";

export enum PopupAction {
	DIMMED = "dimmed",
	RADIUS = "radius",
	TIMER = "timer"
}

export type PopupActionDropdown = {
	label: string;
	Icon: LucideIcon;
	getActive?: () => boolean;
	onclick: () => void;
};

const supportedPopupActions: Partial<Record<MapObjectType, PopupAction[]>> = {
	[MapObjectType.POKEMON]: [PopupAction.DIMMED, PopupAction.RADIUS, PopupAction.TIMER],
	[MapObjectType.POKESTOP]: [PopupAction.DIMMED, PopupAction.RADIUS, PopupAction.TIMER],
	[MapObjectType.GYM]: [PopupAction.DIMMED, PopupAction.RADIUS, PopupAction.TIMER],
	[MapObjectType.STATION]: [PopupAction.DIMMED, PopupAction.RADIUS, PopupAction.TIMER],
	[MapObjectType.TAPPABLE]: [PopupAction.DIMMED, PopupAction.TIMER]
};

export function supportsPopupAction(mapObject: MapObjectType | undefined, action: PopupAction) {
	if (!mapObject) return false;
	return supportedPopupActions[mapObject]?.includes(action) ?? false;
}

export function getPopupActions(
	mapObject: MapObjectType | undefined,
	action: PopupAction
): PopupActionDropdown[] | undefined {
	if (!mapObject) return;

	if (action === PopupAction.DIMMED) {
		return [
			{
				label: mAny("popup_action_undim_all_" + mapObject),
				Icon: Eye,
				onclick: () => clearPopupAction(mapObject, PopupAction.DIMMED)
			}
		];
	} else if (action === PopupAction.RADIUS) {
		const actions: PopupActionDropdown[] = [
			{
				label: mAny("popup_action_show_on_every_" + mapObject),
				Icon: SquareStack,
				getActive: () => isPopupActionAllActive(mapObject, PopupAction.RADIUS),
				onclick: () => togglePopupActionAll(mapObject, PopupAction.RADIUS)
			}
		];
		if (mapObject === MapObjectType.POKEMON) {
			actions.unshift({
				label: m.popup_action_spacial_rend(),
				Icon: Expand,
				getActive: () => isExtraRadiusActive(mapObject),
				onclick: () => toggleExtraRadius(mapObject)
			});
		}
		return actions;
	} else if (action === PopupAction.TIMER) {
		return [
			{
				label: mAny("popup_action_show_on_every_" + mapObject),
				Icon: SquareStack,
				getActive: () => isPopupActionAllActive(mapObject, PopupAction.TIMER),
				onclick: () => togglePopupActionAll(mapObject, PopupAction.TIMER)
			}
		];
	}
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

	if (action === PopupAction.DIMMED) {
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
	if (action === PopupAction.DIMMED) updateDimmedFeatures();
	if (action === PopupAction.RADIUS) updateRadiusFeatures();
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
	if (action === PopupAction.RADIUS) updateRadiusFeatures();
}

export function clearPopupAction(mapObject: MapObjectType | undefined, action: PopupAction) {
	if (!mapObject || !supportsPopupAction(mapObject, action)) return;

	const actionState = getUserSettings().actions[mapObject][action];
	actionState.mapIds = [];
	if ("all" in actionState) actionState.all = false;

	updateUserSettings();
	if (action === PopupAction.DIMMED) updateDimmedFeatures();
	if (action === PopupAction.RADIUS) updateRadiusFeatures();
}

export function isExtraRadiusActive(mapObject: MapObjectType | undefined) {
	if (!mapObject || !supportsPopupAction(mapObject, PopupAction.RADIUS)) return false;
	return getUserSettings().actions[mapObject].radius.extraRadius;
}

export function toggleExtraRadius(mapObject: MapObjectType | undefined, mapId?: string) {
	if (!mapObject || !supportsPopupAction(mapObject, PopupAction.RADIUS)) return;

	const radiusState = getUserSettings().actions[mapObject].radius;
	radiusState.extraRadius = !radiusState.extraRadius;

	if (
		radiusState.extraRadius &&
		mapId &&
		!isPopupActionActive(mapObject, mapId, PopupAction.RADIUS)
	) {
		if (radiusState.all) {
			radiusState.mapIds = radiusState.mapIds.filter((id) => id !== mapId);
		} else {
			radiusState.mapIds.push(mapId);
		}
	}

	updateUserSettings();
	updateRadiusFeatures();
}
