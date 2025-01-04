<script lang="ts">
	import { isPopupExpanded, togglePopupExpanded } from '@/components/ui/popups/isPopupExpanded.svelte.js';
	import { Eye, EyeClosed, Map, Share2, SquareArrowOutUpRight, Navigation } from 'lucide-svelte';
	import Button from '@/components/ui/Button.svelte';
	import { openToast } from '@/components/ui/toast/toastUtils.svelte';
	import { hasClipboardWrite, canNativeShare, copyToClipboard, getMapsUrl } from '@/lib/utils.svelte';
	import * as m from "@/lib/paraglide/messages"

	let {
		lat,
	  	lon,
	}: {
		lat: number,
	  	lon: number
	} = $props()

	function shareCurrentUrl() {
		const shareData = {url: window.location.toString()}
		if (canNativeShare(shareData)) {
			navigator.share(shareData)
		} else if (hasClipboardWrite()) {
			copyToClipboard(window.location.toString())
		}
	}
</script>

<div class="flex px-4 gap-1.5 absolute bottom-4 w-full">
	<Button size="default" onclick={togglePopupExpanded}>
		{#if isPopupExpanded()}
			<EyeClosed size="18"/>
			<span class="max-[304px]:hidden">
				{m.popup_hide_details()}
			</span>
		{:else}
			<Eye size="18"/>
			<span class="max-[304px]:hidden">
				{m.popup_show_details()}
			</span>
		{/if}
	</Button>
	<Button
		size="default"
		variant="outline"
		tag="a"
		href={getMapsUrl(lat, lon)}
		target="_blank"
	>
		<Navigation size="18"/>
		<span class="max-[364px]:hidden">
			{m.popup_navigate()}
		</span>
	</Button>

	{#if canNativeShare() || hasClipboardWrite()}
		<Button
			variant="outline"
			tag="button"
			onclick={shareCurrentUrl}
		>
			<Share2 size="18"/>
			<span class="max-[406px]:hidden">
				{m.popup_share()}
			</span>
		</Button>
	{/if}
</div>