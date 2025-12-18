<script lang="ts">
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import { closeModal, openModal } from "@/lib/ui/modal.svelte.js";
	import Card from '@/components/ui/Card.svelte';
	import * as m from '@/lib/paraglide/messages';
	import Modal from '@/components/ui/modal/Modal.svelte';
	import CloseButton from "@/components/ui/CloseButton.svelte";

	let {
		alt,
		fortUrl,
		fortIcon,
		fortName = '',
		fortDescription = ''
	}: {
		alt: string,
		fortUrl?: string,
		fortIcon: string,
		fortName?: string,
		fortDescription?: string
	} = $props();
</script>

<Modal modalType="fortDetails">
	<Card
		class="mx-auto items-center flex flex-col rounded-md! shadow-none! overflow-hidden w-xl max-w-full p-2"
		style="max-height: calc(100vh - 6rem)"
	>
<!--		<div class="flex justify-end p-2 w-full">-->
<!--			<CloseButton-->
<!--			class=""-->
<!--			onclick={() => closeModal("fortDetails")}-->
<!--		/>-->
<!--		</div>-->

		<img
			class="w-full object-contain"
			style="height: clamp(6rem, 100%, 31rem)"
			src={fortUrl}
			{alt}
		>

		{#if fortName || fortDescription}
			<div
				class="mt-2 flex flex-col justify-center text-center mx-6"
			>
				{#if fortName}
					<span class="font-semibold text-lg">
						{fortName}
					</span>
				{/if}
				{#if fortDescription}
					<span>
						{fortDescription}
					</span>
				{/if}
			</div>
		{/if}
	</Card>
</Modal>

{#if fortUrl}
	<button
		class="group relative h-14 w-14 shrink-0 focus-visible:ring-ring rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-4 cursor-pointer"
		onclick={() => openModal("fortDetails")}
		title={m.view_full_image()}
	>
		<ImagePopup
			{alt}
			src={fortUrl}
			class="absolute transition-all top-0 object-cover h-14 w-14 rounded-full ring-border ring-2 ring-offset-card ring-offset-2"
		/>
		<span class="opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity absolute left-0 top-0 w-14 h-14 rounded-full backdrop-brightness-75"></span>
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