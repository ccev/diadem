<script lang="ts">
	import { isPopupExpanded } from '@/components/ui/popups/isPopupExpanded.svelte';
	import PopupButtons from '@/components/ui/popups/PopupButtons.svelte';
	import Card from '@/components/ui/Card.svelte';
	import { X } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import { closePopup } from '@/lib/mapObjects/mapObjects.svelte.js';
	import { slide } from 'svelte/transition';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import Button from '@/components/ui/Button.svelte';

	let {
		lat,
		lon,
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

</script>

<Card class="h-full relative overflow-hidden py-4 mx-2">
	<div class="flex px-6 w-full items-center justify-between mb-2">
		{@render image()}
		<div class="w-full h-fit ml-4">
			{@render title()}

			{#if !isPopupExpanded()}
				<div
					class="mt-1"
					in:slide={{duration: 90, easing: cubicOut}}
					out:slide={{duration: 90, easing: cubicIn}}
				>
					{@render description?.()}
				</div>
			{/if}
		</div>
		<Button variant="ghost" size="" class="self-start ml-0.5 rounded-sm -mt-2 p-2 -mr-4" onclick={() => closePopup()}>
			<X />
		</Button>
	</div>

	{#if isPopupExpanded()}
		<div
			class="px-6"
		 	in:slide={{duration: 90, easing: cubicIn}}
			out:slide={{duration: 90, easing: cubicOut}}
		>
			{@render content?.()}
		</div>
	{/if}

	<div class="h-12"></div>
	<PopupButtons {lat} {lon} />
</Card>