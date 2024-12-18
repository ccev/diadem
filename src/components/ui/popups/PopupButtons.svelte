<script lang="ts">
	import { isPopupExpanded, togglePopupExpanded } from '@/components/ui/popups/isPopupExpanded.svelte.js';
	import { Eye, EyeClosed, Map, Share2 } from 'lucide-svelte';
	import Button from '@/components/ui/Button.svelte';

	let {
		lat,
	  	lon,
	}: {
		lat: number,
	  	lon: number
	} = $props()

	function hasNativeShare() {
		return navigator.share && navigator.canShare
	}

	function hasClipboardWrite() {
		return navigator.clipboard && navigator.clipboard.writeText
	}

	function shareCurrentUrl() {
		const shareData = {url: window.location.toString()}
		if (hasNativeShare() && navigator.canShare(shareData)) {
			navigator.share(shareData)
		} else if (hasClipboardWrite()) {
			navigator.clipboard.writeText(window.location.toString())
			// TODO: Toasts
		}
	}
</script>

<div class="flex px-4 gap-1.5 absolute bottom-4 w-full">
	<Button size="default" onclick={togglePopupExpanded}>
		{#if isPopupExpanded()}
			<EyeClosed size="20"/>
			<span class="max-[304px]:hidden">Hide details</span>
		{:else}
			<Eye size="20"/>
			<span class="max-[304px]:hidden">Show details</span>
		{/if}
	</Button>
	<Button
		size="default"
		variant="outline"
		tag="a"
		href="https://maps.google.com?q={lat},{lon}"
		target="_blank"
	>
		<Map size="20"/>
		<span class="max-[364px]:hidden">Navigate</span>
	</Button>

	{#if hasNativeShare() || hasClipboardWrite()}
		<Button
			variant="outline"
			tag="button"
			onclick={shareCurrentUrl}
		>
			<Share2 size="20"/>
			<span class="max-[406px]:hidden">Share</span>
		</Button>
	{/if}
	<!--		<Button size="default" variant="outline">-->
	<!--			Hide-->
	<!--		</Button>-->
</div>