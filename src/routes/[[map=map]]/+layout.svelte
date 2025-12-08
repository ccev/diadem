<script lang="ts">
	import "../../app.css";

	import Toast from "@/components/ui/Toast.svelte";
	import { getIsToastOpen } from "@/lib/ui/toasts.svelte.js";
	import { getIsLoading, load } from "@/lib/services/initialLoad.svelte.js";
	import Loading from "@/components/ui/Loading.svelte";
	import { onMount } from "svelte";
	import Metadata from "@/components/utils/Metadata.svelte";

	let { children } = $props();

	onMount(() => load().then());
</script>

<svelte:head>
	<Metadata />
</svelte:head>

{#if getIsLoading()}
	<Loading />
{/if}

{#if getIsToastOpen()}
	<Toast />
{/if}

{@render children?.()}
