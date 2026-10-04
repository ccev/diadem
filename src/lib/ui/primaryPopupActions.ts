import {
	Binoculars,
	CircleDot,
	CircleOff,
	Eye,
	EyeClosed,
	Focus,
	Navigation,
	Scan,
	Timer,
	TimerOff
} from "@lucide/svelte";
import { m } from "@/lib/paraglide/messages";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import { ClientMapObjectType, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getMapsUrl } from "@/lib/utils/mapUrl";
import { Coords } from "@/lib/utils/coordinates";
import { getShareTitle } from "@/lib/features/shareTexts";
import { getFocusedRouteMapId, setFocusedRouteMapId } from "@/lib/features/focusedRoute.svelte";
import { refreshRouteFeatures } from "@/lib/map/featuresGen.svelte";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { setCurrentScoutCenter, setCurrentScoutCoords } from "@/lib/features/scout.svelte";
import { getConfig } from "@/lib/services/config/config";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
import { Menu, openMenu } from "@/lib/ui/menus.svelte";
import { Features } from "@/lib/utils/features";
import {
	isPopupActionActive,
	PopupAction,
	supportsPopupAction,
	togglePopupAction
} from "@/lib/ui/popupActions";
import type { QuickAction } from "@/lib/ui/quickActions.svelte";

export type PrimaryPopupAction = QuickAction & { popupAction?: PopupAction };

/** The primary popup buttons, shared with marker quick actions. */
export function getPrimaryPopupActions(
	data: MapData,
	lat = data.lat,
	lon = data.lon
): PrimaryPopupAction[] {
	const type = data.type === ClientMapObjectType.LOCATION ? undefined : data.type;
	const actions: PrimaryPopupAction[] = [
		{
			label: m.popup_navigate(),
			Icon: Navigation,
			href: getMapsUrl(new Coords(lat, lon), getShareTitle(data))
		}
	];
	if (
		data.type === ClientMapObjectType.LOCATION &&
		getConfig().tools.scout &&
		hasFeatureAnywhere(getUserDetails().permissions, Features.SCOUT)
	) {
		actions.push({
			label: m.scout_location(),
			Icon: Binoculars,
			onclick: () => {
				const coords = new Coords(lat, lon);
				setCurrentScoutCoords([coords]);
				setCurrentScoutCenter(coords);
				openMenu(Menu.SCOUT);
			}
		});
	}
	if (type === MapObjectType.ROUTE && getUserSettings().filters.route.enabled) {
		const focused = getFocusedRouteMapId() === data.mapId;
		actions.push({
			label: focused ? m.unfocus_route() : m.focus_route(),
			Icon: focused ? Scan : Focus,
			onclick: () => {
				setFocusedRouteMapId(getFocusedRouteMapId() === data.mapId ? null : data.mapId);
				refreshRouteFeatures();
			}
		});
	}
	for (const action of [PopupAction.DIMMED, PopupAction.RADIUS, PopupAction.TIMER] as const) {
		if (!supportsPopupAction(type, action)) continue;
		const active = isPopupActionActive(type, data.mapId, action);
		const appearance = {
			[PopupAction.DIMMED]: {
				label: active ? m.popup_action_undim() : m.popup_action_dim(),
				Icon: active ? Eye : EyeClosed
			},
			[PopupAction.RADIUS]: {
				label: active ? m.popup_action_hide_radius() : m.popup_action_show_radius(),
				Icon: active ? CircleOff : CircleDot
			},
			[PopupAction.TIMER]: {
				label: active ? m.popup_action_hide_timer() : m.popup_action_show_timer(),
				Icon: active ? TimerOff : Timer
			}
		};
		actions.push({
			...appearance[action],
			popupAction: action,
			onclick: () => togglePopupAction(type, data.mapId, action)
		});
	}
	return actions;
}
