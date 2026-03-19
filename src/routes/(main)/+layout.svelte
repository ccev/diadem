<script lang="ts">
	import { onMount } from "svelte";
	import { getIsLoading, load } from "@/lib/services/initialLoad.svelte";
	import Metadata from "@/components/utils/Metadata.svelte";
	import Toast from "@/components/ui/Toast.svelte";
	import { getIsToastOpen } from "@/lib/ui/toasts.svelte";
	import Modal from "@/components/ui/modal/Modal.svelte";
	import { getSelectOptions } from "@/lib/ui/modal.svelte";
	import Loading from "@/components/ui/Loading.svelte";

	let { data, children } = $props();

	onMount(() => load().then());
</script>

<Metadata />

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
