<script lang="ts">
	import { isPopupExpanded } from '@/components/ui/popups/isPopupExpanded.svelte';
	import PopupButtons from '@/components/ui/popups/PopupButtons.svelte';
	import Card from '@/components/ui/Card.svelte';
	import { X } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import {closePopup} from '@/components/ui/popups/mapObjects.svelte';

	let {
		lat,
		lon,
		heightCol = "138",
		heightExp = "300",
		image,
		title,
		description = undefined,
		content = undefined
	}: {
		lat: number,
		lon: number,
		heightCol?: string,
		heightExp?: string,
		image: Snippet,
		title: Snippet,
		description?: Snippet,
		content?: Snippet
	} = $props()

	let cardStyle = $state("")
	$effect(() => {
		isPopupExpanded
		if (isPopupExpanded()) {
			cardStyle = `height: ${heightExp}px`
		} else {
			cardStyle = `height: ${heightCol}px`
		}
	})
</script>

<Card class="transition-all relative overflow-hidden py-4 mx-2" style={cardStyle}>
	<div class="flex px-6 w-full items-center justify-between gap-4 mb-2">
		{@render image()}
		<div class="w-full h-fit">
			{@render title()}

			{#if !isPopupExpanded()}
				{@render description?.()}
			{/if}
		</div>
		<button class="self-start" onclick={() => closePopup()}>
			<X />
		</button>
	</div>

	{#if isPopupExpanded()}
		<div class="px-6">
			{@render content?.()}
		</div>
	{/if}

	<PopupButtons {lat} {lon} />
</Card>