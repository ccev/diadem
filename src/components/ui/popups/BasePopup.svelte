<script lang="ts">
	import { isPopupExpanded } from '@/components/ui/popups/isPopupExpanded.svelte';
	import PopupButtons from '@/components/ui/popups/common/PopupButtons.svelte';
	import Card from '@/components/ui/Card.svelte';
	import { X } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import Button from '@/components/ui/Button.svelte';
	import CloseButton from '@/components/ui/CloseButton.svelte';
	import { closePopup } from '@/lib/mapObjects/interact';

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

<div
	class="rounded-lg border bg-card text-card-foreground shadow-md h-full relative overflow-hidden py-4 mx-2"
>
	<CloseButton
		class="absolute right-2 top-2"
		onclick={closePopup}
	/>
	<div class="flex pl-6 pr-3 w-full items-center mb-2">
		{@render image()}
		<div class="w-full h-fit ml-4 max-h-full">
			<div class="mr-9">
				{@render title()}
			</div>


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
</div>