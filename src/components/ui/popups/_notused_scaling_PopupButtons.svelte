<script lang="ts">
	import { isPopupExpanded, togglePopupExpanded } from '@/components/ui/popups/isPopupExpanded.svelte.js';
	import { Eye, EyeClosed, Navigation, Share2 } from 'lucide-svelte';
	import Button from '@/components/ui/input/Button.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { untrack } from 'svelte';
	import { getCurrentPath } from '@/lib/mapObjects/interact';
	import { canNativeShare, copyToClipboard, hasClipboardWrite } from '@/lib/utils/device';
	import { getMapsUrl } from '@/lib/utils/mapUrl';

	let {
		lat,
	  	lon,
	}: {
		lat: number,
	  	lon: number
	} = $props()

	function shareUrl() {
		const url = window.location.origin + getCurrentPath()
		const shareData = {url}
		if (canNativeShare(shareData)) {
			navigator.share(shareData)
		} else if (hasClipboardWrite()) {
			copyToClipboard(window.location.toString())
		}
	}

	let containerWidth: number = $state(0)
	let detailsWidth: number = $state(0)
	let navigateWidth: number = $state(0)
	let shareWidth: number = $state(0)
	let showDetails: boolean = $state(true)
	let showNavigate: boolean = $state(true)
	let showShare: boolean = $state(true)
	const containerPadding = 32
	const gapPadding = 6

	$effect(() => {
		containerWidth
		untrack(() => {
			showShare = containerPadding + detailsWidth + gapPadding + navigateWidth + gapPadding + shareWidth <= containerWidth
			showNavigate = containerPadding + detailsWidth + gapPadding + navigateWidth <= containerWidth
			showDetails = containerPadding + detailsWidth <= containerWidth

		})

	})
</script>

<div
	class="flex px-4 gap-1.5 absolute bottom-4 w-full"
	bind:clientWidth={containerWidth}
>
	<div bind:clientWidth={detailsWidth}>
		<Button
			size="default"
			onclick={togglePopupExpanded}
		>
			{#if isPopupExpanded()}
				<EyeClosed size="18"/>
				{#if showDetails}
					<span>
						{m.popup_hide_details()}
					</span>
				{/if}
			{:else}
				<Eye size="18"/>
				{#if showDetails}
				<span>
					{m.popup_show_details()}
				</span>
				{/if}
			{/if}
		</Button>
	</div>
	<div bind:clientWidth={navigateWidth}>
		<Button
			size="default"
			variant="outline"
			tag="a"
			href={getMapsUrl(lat, lon)}
			target="_blank"
		>
			<Navigation size="18"/>
			{#if showNavigate}
				<span>
					{m.popup_navigate()}
				</span>
			{/if}
		</Button>
	</div>

	{#if canNativeShare() || hasClipboardWrite()}
		<div bind:clientWidth={shareWidth}>
			<Button
				variant="outline"
				tag="button"
				onclick={shareUrl}
			>
				<Share2 size="18"/>
				{#if showShare}
					<span>
						{m.popup_share()}
					</span>
				{/if}
			</Button>
		</div>
	{/if}
</div>