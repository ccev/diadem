<script lang="ts">
	import {
		getPopupActions,
		isPopupActionActive,
		isPopupExpanded,
		PopupAction,
		supportsPopupAction,
		togglePopupAction,
		togglePopupExpanded
	} from "@/lib/ui/popupActions.js";
	import {
		Binoculars,
		CircleDot,
		CircleOff,
		Eye,
		EyeClosed,
		Focus,
		Minus,
		Navigation,
		Plus,
		Timer,
		TimerOff,
		Scan
	} from "@lucide/svelte";

	import { getMapsUrl } from "@/lib/utils/mapUrl";
	import { Coords } from "@/lib/utils/coordinates";
	import { getShareTitle } from "@/lib/features/shareTexts";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
	import PopupButton from "@/components/ui/popups/common/PopupButton.svelte";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";
	import { ClientMapObjectType, MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import { getFocusedRouteMapId, setFocusedRouteMapId } from "$lib/features/focusedRoute.svelte.js";
	import { refreshRouteFeatures } from "$lib/map/featuresGen.svelte";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { setCurrentScoutCenter, setCurrentScoutCoords } from "$lib/features/scout.svelte";
	import { getConfig } from "$lib/services/config/config";
	import { hasFeatureAnywhere } from "$lib/services/user/checkPerm";
	import { getUserDetails } from "$lib/services/user/userDetails.svelte";
	import { Menu, openMenu } from "$lib/ui/menus.svelte";
	import { Features } from "$lib/utils/features";
	import { isMenuSidebar } from "$lib/utils/device";

	let {
		lat,
		lon,
		data
	}: {
		lat: number;
		lon: number;
		data: MapData;
	} = $props();

	let selectedType = $derived(data.type === ClientMapObjectType.LOCATION ? undefined : data.type);
	let selectedMapId = $derived(data?.mapId);
	let routeFocused = $derived(
		selectedType === MapObjectType.ROUTE && getFocusedRouteMapId() === selectedMapId
	);
</script>

<div
	class="px-4 flex gap-2 w-full overflow-x-auto pb-2"
	class:flex-wrap={isMenuSidebar()}
	class:*:flex-1={isMenuSidebar()}
>
	<PopupButton
		variant="default"
		Icon={Navigation}
		label="Navigate"
		tag="a"
		href={getMapsUrl(new Coords(lat, lon), getShareTitle(getCurrentSelectedData()))}
		target="_blank"
	/>
	{#if data.type === ClientMapObjectType.LOCATION && getConfig().tools.scout && hasFeatureAnywhere(getUserDetails().permissions, Features.SCOUT)}
		<PopupButton
			Icon={Binoculars}
			label="Scout location"
			onclick={() => {
				const coords = new Coords(lat, lon);
				setCurrentScoutCoords([coords]);
				setCurrentScoutCenter(coords);
				openMenu(Menu.SCOUT);
			}}
		/>
	{/if}
	{#if supportsPopupAction(selectedType, PopupAction.FOCUS_ROUTE) && getUserSettings().filters.route.enabled}
		<PopupButton
			Icon={Focus}
			label="Focus Route"
			IconActive={Scan}
			labelActive="Unfocus Route"
			active={routeFocused}
			onclick={() => {
				setFocusedRouteMapId(routeFocused ? null : selectedMapId);
				refreshRouteFeatures();
			}}
		/>
	{/if}
	{#if supportsPopupAction(selectedType, PopupAction.DIMMED)}
		<PopupButton
			Icon={EyeClosed}
			label="Dim"
			IconActive={Eye}
			labelActive="Undim"
			active={isPopupActionActive(selectedType, selectedMapId, PopupAction.DIMMED)}
			onclick={() => togglePopupAction(selectedType, selectedMapId, PopupAction.DIMMED)}
			actions={getPopupActions(selectedType, PopupAction.DIMMED)}
		/>
	{/if}
	{#if supportsPopupAction(selectedType, PopupAction.RADIUS)}
		<PopupButton
			Icon={CircleDot}
			label="Show range"
			IconActive={CircleOff}
			labelActive="Hide range"
			active={isPopupActionActive(selectedType, selectedMapId, PopupAction.RADIUS)}
			onclick={() => togglePopupAction(selectedType, selectedMapId, PopupAction.RADIUS)}
			actions={getPopupActions(selectedType, PopupAction.RADIUS)}
		/>
	{/if}
	{#if supportsPopupAction(selectedType, PopupAction.TIMER)}
		<PopupButton
			Icon={Timer}
			label="Show timer"
			IconActive={TimerOff}
			labelActive="Hide timer"
			active={isPopupActionActive(selectedType, selectedMapId, PopupAction.TIMER)}
			onclick={() => togglePopupAction(selectedType, selectedMapId, PopupAction.TIMER)}
			actions={getPopupActions(selectedType, PopupAction.TIMER)}
		/>
	{/if}
</div>
