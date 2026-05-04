<script lang="ts">
	import {
		clearPopupAction,
		isExtraRadiusActive,
		isPopupActionActive,
		isPopupActionAllActive,
		isPopupExpanded,
		supportsPopupAction,
		toggleExtraRadius,
		togglePopupAction,
		togglePopupActionAll,
		togglePopupExpanded
	} from "@/lib/ui/popupActions.js";
	import {
		CheckCheck,
		ChevronUp,
		CircleDot,
		CircleDotDashed,
		CircleOff,
		Copy,
		Ellipsis,
		Expand,
		Eye,
		EyeClosed,
		EyeOff,
		Minus,
		Navigation,
		Plus,
		Radius,
		Share2,
		SquareStack,
		Tag,
		Tags,
		Timer,
		TimerOff
	} from "lucide-svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import * as m from "@/lib/paraglide/messages";

	import { getCurrentPath } from "@/lib/mapObjects/interact";
	import {
		backupShareUrl,
		canNativeShare,
		copyToClipboard,
		hasClipboardWrite
	} from "@/lib/utils/device";
	import { getMapsUrl } from "@/lib/utils/mapUrl";
	import { Coords } from "@/lib/utils/coordinates";
	import { getShareTitle } from "@/lib/features/shareTexts";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
	import { getLocale } from "@/lib/paraglide/runtime";
	import PopupButton from "@/components/ui/popups/common/PopupButton.svelte";

	let {
		lat,
		lon
	}: {
		lat: number;
		lon: number;
	} = $props();

	function getShareUrl() {
		return window.location.origin + getCurrentPath() + "?lang=" + getLocale();
	}

	let selectedData = $derived(getCurrentSelectedData());
	let selectedType = $derived(selectedData?.type);
	let selectedMapId = $derived(selectedData?.mapId);
</script>

<div class="flex px-4 gap-1.5 w-full overflow-x-scroll pb-4">
	<PopupButton
		variant="default"
		Icon={Plus}
		label={m.popup_show_details()}
		IconActive={Minus}
		labelActive={m.popup_hide_details()}
		active={isPopupExpanded(selectedType)}
		onclick={() => togglePopupExpanded(selectedType)}
	/>
	<PopupButton
		Icon={Navigation}
		label={m.popup_navigate()}
		tag="a"
		href={getMapsUrl(new Coords(lat, lon), getShareTitle(getCurrentSelectedData()))}
		target="_blank"
	/>
	{#if supportsPopupAction(selectedType, "dimmed")}
		<PopupButton
			Icon={EyeClosed}
			label={m.popup_action_dim()}
			IconActive={Eye}
			labelActive={m.popup_action_undim()}
			active={isPopupActionActive(selectedType, selectedMapId, "dimmed")}
			onclick={() => togglePopupAction(selectedType, selectedMapId, "dimmed")}
			actions={[
				{
					label: m.popup_action_undim_all_pokemon(),
					Icon: Eye,
					onclick: () => clearPopupAction(selectedType, "dimmed")
				}
			]}
		/>
	{/if}
	{#if supportsPopupAction(selectedType, "radius")}
		<PopupButton
			Icon={CircleDot}
			label={m.popup_action_show_radius()}
			IconActive={CircleOff}
			labelActive={m.popup_action_hide_radius()}
			active={isPopupActionActive(selectedType, selectedMapId, "radius")}
			onclick={() => togglePopupAction(selectedType, selectedMapId, "radius")}
			actions={[
				{
					label: m.popup_action_spacial_rend(),
					Icon: Expand,
					getActive: () => isExtraRadiusActive(selectedType),
					onclick: () => toggleExtraRadius(selectedType, selectedMapId)
				},
				{
					label: m.popup_action_show_on_every_pokemon(),
					Icon: SquareStack,
					getActive: () => isPopupActionAllActive(selectedType, "radius"),
					onclick: () => togglePopupActionAll(selectedType, "radius")
				}
			]}
		/>
	{/if}
	{#if supportsPopupAction(selectedType, "timer")}
		<PopupButton
			Icon={Timer}
			label={m.popup_action_show_timer()}
			IconActive={TimerOff}
			labelActive={m.popup_action_hide_timer()}
			active={isPopupActionActive(selectedType, selectedMapId, "timer")}
			onclick={() => togglePopupAction(selectedType, selectedMapId, "timer")}
			actions={[
				{
					label: m.popup_action_show_on_every_pokemon(),
					Icon: SquareStack,
					getActive: () => isPopupActionAllActive(selectedType, "timer"),
					onclick: () => togglePopupActionAll(selectedType, "timer")
				}
			]}
		/>
	{/if}

	<!--{#if canNativeShare({ url: getShareUrl() })}-->
	<!--	<Button variant="outline" tag="button" onclick={() => backupShareUrl(getShareUrl())}>-->
	<!--		<Share2 size="18" />-->
	<!--		<span class="">-->
	<!--			{m.popup_share()}-->
	<!--		</span>-->
	<!--	</Button>-->
	<!--{:else if hasClipboardWrite()}-->
	<!--	<Button variant="outline" tag="button" onclick={() => copyToClipboard(getShareUrl())}>-->
	<!--		<Copy size="18" />-->
	<!--		<span class="">-->
	<!--			{m.copy_link()}-->
	<!--		</span>-->
	<!--	</Button>-->
	<!--{/if}-->
</div>
