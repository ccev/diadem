<script lang="ts">
	import {
		getPopupActions,
		isPopupActionActive,
		PopupAction, showAutoBattleButton,
		supportsPopupAction,
		togglePopupAction
	} from "@/lib/ui/popupActions.js";
	import { CircleDot, CircleOff, Eye, EyeClosed, Navigation, Ticket, Timer, TimerOff } from "@lucide/svelte";
	import * as m from "@/lib/paraglide/messages";
	import { getMapsUrl } from "@/lib/utils/mapUrl";
	import { Coords } from "@/lib/utils/coordinates";
	import { getShareTitle } from "@/lib/features/shareTexts";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
	import PopupButton from "@/components/ui/popups/common/PopupButton.svelte";
	import { type MapData, MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import { currentTimestamp } from "$lib/utils/currentTimestamp";
	import { hasActiveRaid } from "$lib/utils/gymUtils";
	import { isMaxBattleActive } from "$lib/utils/stationUtils";
	import { isSupportedFeature } from "$lib/services/supportedFeatures";

	let {
		lat,
		lon,
		data
	}: {
		lat: number;
		lon: number;
		data: MapData;
	} = $props();

	let selectedType = $derived(data?.type);
	let selectedMapId = $derived(data?.mapId);
</script>

<div class="flex px-4 gap-2 w-full overflow-x-auto pb-2">
	<PopupButton
		variant="default"
		Icon={Navigation}
		label={m.popup_navigate()}
		tag="a"
		href={getMapsUrl(new Coords(lat, lon), getShareTitle(getCurrentSelectedData()))}
		target="_blank"
	/>
	{#if showAutoBattleButton(data)}
		<PopupButton
			Icon={Ticket}
			label="Get Remote Invite"
			onclick={() => {}}
		/>
	{/if}
	{#if supportsPopupAction(selectedType, PopupAction.DIMMED)}
		<PopupButton
			Icon={EyeClosed}
			label={m.popup_action_dim()}
			IconActive={Eye}
			labelActive={m.popup_action_undim()}
			active={isPopupActionActive(selectedType, selectedMapId, PopupAction.DIMMED)}
			onclick={() => togglePopupAction(selectedType, selectedMapId, PopupAction.DIMMED)}
			actions={getPopupActions(selectedType, PopupAction.DIMMED)}
		/>
	{/if}
	{#if supportsPopupAction(selectedType, PopupAction.RADIUS)}
		<PopupButton
			Icon={CircleDot}
			label={m.popup_action_show_radius()}
			IconActive={CircleOff}
			labelActive={m.popup_action_hide_radius()}
			active={isPopupActionActive(selectedType, selectedMapId, PopupAction.RADIUS)}
			onclick={() => togglePopupAction(selectedType, selectedMapId, PopupAction.RADIUS)}
			actions={getPopupActions(selectedType, PopupAction.RADIUS)}
		/>
	{/if}
	{#if supportsPopupAction(selectedType, PopupAction.TIMER)}
		<PopupButton
			Icon={Timer}
			label={m.popup_action_show_timer()}
			IconActive={TimerOff}
			labelActive={m.popup_action_hide_timer()}
			active={isPopupActionActive(selectedType, selectedMapId, PopupAction.TIMER)}
			onclick={() => togglePopupAction(selectedType, selectedMapId, PopupAction.TIMER)}
			actions={getPopupActions(selectedType, PopupAction.TIMER)}
		/>
	{/if}
</div>
