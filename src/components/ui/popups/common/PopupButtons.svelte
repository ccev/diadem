<script lang="ts">
	import { isPopupExpanded, togglePopupExpanded } from "@/lib/ui/expandedPopups.js";
	import {
		CheckCheck,
		ChevronUp,
		CircleDot, CircleDotDashed,
		Copy, Ellipsis, Expand,
		Eye,
		EyeClosed,
		EyeOff, Minus,
		Navigation, Plus,
		Radius,
		Share2, SquareStack, Tag, Tags,
		Timer, TimerOff
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
</script>

<div class="flex px-4 gap-1.5 w-full overflow-x-scroll pb-4">
	<PopupButton
		variant="default"
		Icon={Plus}
		label={m.popup_show_details()}
		IconActive={Minus}
		labelActive={m.popup_hide_details()}
		active={isPopupExpanded(getCurrentSelectedData()?.type)}
		onclick={() => togglePopupExpanded(getCurrentSelectedData()?.type)}
	/>
	<PopupButton
		Icon={Navigation}
		label={m.popup_navigate()}
		tag="a"
		href={getMapsUrl(new Coords(lat, lon), getShareTitle(getCurrentSelectedData()))}
		target="_blank"
	/>
	<PopupButton
		Icon={EyeClosed}
		label="Dim"
		IconActive={Eye}
		labelActive="Undim"
		active={false}
		actions={[
			{
				label: "Undim all Pokemon",
				Icon: Eye,
				onclick: () => {}
			},
		]}
	/>
	<PopupButton
		Icon={CircleDot}
		label="Show range"
		IconActive={CircleDotDashed}
		labelActive="Hide range"
		active={false}
		actions={[
			{
				label: "Spacial Rend",
				Icon: Expand,
				getActive: () => false,
				onclick: () => {}
			},
			{
				label: "Show on every Pokemon",
				Icon: SquareStack,
				getActive: () => true,
				onclick: () => {}
			}
		]}
	/>
	<PopupButton
		Icon={Timer}
		label="Show timer"
		IconActive={TimerOff}
		labelActive="Hide timer"
		active={false}
		actions={[
			{
				label: "Show on every Pokemon",
				Icon: SquareStack,
				getActive: () => true,
				onclick: () => {}
			}
		]}
	/>

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
