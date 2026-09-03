<script lang="ts">
	import { onMount } from "svelte";
	import { watch } from "runed";
	import { page } from "$app/state";
	import { getIsLoading, load } from "@/lib/services/initialLoad.svelte";
	import Toast from "@/components/ui/Toast.svelte";
	import { getIsToastOpen } from "@/lib/ui/toasts.svelte";
	import Modal from "@/components/ui/modal/Modal.svelte";
	import { getSelectOptions } from "@/lib/ui/modal.svelte";
	import Loading from "@/components/ui/Loading.svelte";
	import FortDetailsModal from "@/components/ui/popups/common/FortDetailsModal.svelte";
	import { closeTopOverlay, reconcileOverlays } from "@/lib/ui/overlays.svelte";
	import { syncUserSettings } from "@/lib/services/userSettings.svelte";

	let { data, children } = $props();

	onMount(() => load().then());

	watch(() => page.state, reconcileOverlays);
</script>

<svelte:window onpagehide={syncUserSettings} />

<svelte:document
	onvisibilitychange={() => {
		if (document.visibilityState === "hidden") syncUserSettings();
	}}
	onkeydown={(event) => {
		if (event.key !== "Escape" || !closeTopOverlay()) return;
		event.preventDefault();
		event.stopImmediatePropagation();
	}}
/>

{#if getIsToastOpen()}
	<Toast />
{/if}

<Modal modalType="select">
	<div
		style="width: min(calc(100vw - 1rem), 32rem);"
		class="py-4 px-3 flex flex-col gap-0.5 bg-popover text-popover-foreground border rounded-md"
	>
		{@render getSelectOptions()?.()}
	</div>
</Modal>

{#if getIsLoading()}
	<Loading />
{/if}

{@render children?.()}

<FortDetailsModal />
