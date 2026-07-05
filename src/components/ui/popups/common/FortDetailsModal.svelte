<script module lang="ts">
	import { openModal } from "$lib/ui/modal.svelte";
	import { rememberPopupBaseDrawerExpandedSnapPoint } from "$lib/ui/popupDrawer.svelte";

	type FortDetails = {
		alt: string;
		fortUrl: string;
		fortName?: string;
		fortDescription?: string;
	};

	let fortDetails: FortDetails | undefined = $state(undefined);

	export function openFortDetailsModal(details: FortDetails) {
		rememberPopupBaseDrawerExpandedSnapPoint();
		fortDetails = details;
		openModal("fortDetails");
	}
</script>

<script lang="ts">
	import Card from "@/components/ui/Card.svelte";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import Modal from "@/components/ui/modal/Modal.svelte";
	import { closeModal } from "$lib/ui/modal.svelte";
	import { onDestroy } from "svelte";
	import {
		clearPopupBaseDrawerExpandedSnapPointRestore,
		restorePopupBaseDrawerExpandedSnapPoint
	} from "$lib/ui/popupDrawer.svelte";

	let restoreDrawerSnapPointInterval: ReturnType<typeof setInterval> | undefined;

	function restoreExpandedDrawerSnapPoint() {
		clearInterval(restoreDrawerSnapPointInterval);
		restorePopupBaseDrawerExpandedSnapPoint();
		requestAnimationFrame(restorePopupBaseDrawerExpandedSnapPoint);
		restoreDrawerSnapPointInterval = setInterval(restorePopupBaseDrawerExpandedSnapPoint, 50);
		window.setTimeout(() => {
			restorePopupBaseDrawerExpandedSnapPoint();
			clearInterval(restoreDrawerSnapPointInterval);
			restoreDrawerSnapPointInterval = undefined;
			clearPopupBaseDrawerExpandedSnapPointRestore();
		}, 1500);
	}

	function closeFortDetails() {
		closeModal("fortDetails");
		restoreExpandedDrawerSnapPoint();
	}

	onDestroy(() => clearInterval(restoreDrawerSnapPointInterval));
</script>

<Modal
	modalType="fortDetails"
	onopenchange={(open) => {
		if (!open) restoreExpandedDrawerSnapPoint();
	}}
>
	{#if fortDetails}
		<Card
			class="relative mx-auto items-center flex flex-col rounded-md! shadow-none! overflow-hidden w-xl max-w-full"
			style="max-height: calc(100vh - 6rem)"
		>
			<div class="absolute top-0 right-0 z-10 m-2 p-1">
				<CloseButton class="bg-neutral-800/90! rounded-full! border-none! hover:bg-neutral-800 active:bg-neutral-800" onclick={closeFortDetails} variant="" />
			</div>

			<img
				class="w-full object-contain"
				style="height: clamp(6rem, 100%, 31rem)"
				src={fortDetails.fortUrl}
				alt={fortDetails.alt}
			/>
		</Card>
	{/if}
</Modal>
