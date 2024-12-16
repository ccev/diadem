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

<Card class="mx-2 transition-all relative overflow-hidden" style={cardStyle}>
	<div class="flex w-full items-center justify-between gap-4 mb-2">
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
		{@render content?.()}
	{/if}

	<PopupButtons {lat} {lon} />
</Card>