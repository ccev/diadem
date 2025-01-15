<script lang="ts">
	import ImagePopup from '@/components/ui/popups/ImagePopup.svelte';
	import { closeModal, openModal } from '@/lib/modal.svelte';
	import Button from '@/components/ui/Button.svelte';
	import Card from '@/components/ui/Card.svelte';
	import * as m from "@/lib/paraglide/messages"
	import CloseButton from '@/components/ui/CloseButton.svelte';


	let {
		alt,
		fortUrl,
		fortIcon,
		fortName = "",
	}: {
		alt: string,
		fortUrl?: string,
		fortIcon: string,
		fortName?: string,
	} = $props()

	let photoWidth: number = $state(0)
</script>

{#snippet fullImage()}
	<Card class="mx-auto items-center flex flex-col rounded-md! overflow-hidden">
		<img
			class=""
			src={fortUrl}
			{alt}
			bind:clientWidth={photoWidth}
		>

		<CloseButton
			class="absolute right-2 top-2 hover:bg-transparent backdrop-brightness-90 backdrop-blur-[2px] hover:backdrop-brightness-75"
			onclick={closeModal}
		/>

<!--		TODO add neutral fort icon-->
		{#if fortName}
			<span
				class="mx-6 my-3 text-center"
				style="max-width: calc({photoWidth}px - 3rem)"
			>
				{fortName}
			</span>
		{/if}
	</Card>
{/snippet}

{#if fortUrl}
	<button
		class="group relative h-14 w-14 shrink-0 focus-visible:ring-ring rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
		onclick={() => openModal(fullImage)}
		title={m.view_full_image()}
	>
		<ImagePopup
			{alt}
			src={fortUrl}
			class="absolute transition-all top-0 object-cover h-14 w-14 rounded-full ring-border ring-2 ring-offset-card ring-offset-2"
		/>
		<span class="opacity-0 group-hover:opacity-100 transition-opacity absolute left-0 top-0 w-14 h-14 rounded-full backdrop-brightness-75"></span>
	</button>

{:else}
	<div class="w-12 shrink-0">
		<ImagePopup
			{alt}
			src={fortIcon}
			class="h-12 w-12"
		/>
	</div>
{/if}