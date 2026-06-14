<script lang="ts">
	import { m } from "@/lib/paraglide/messages";
	import Button from "@/components/ui/input/Button.svelte";
	import { ArrowLeft, Loader2, Sparkles } from "lucide-svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { getWayfarerInvokedFromMap } from "@/lib/features/wayfarerMap.svelte";
	import {
		fetchCandidatesForCurrentBounds,
		getCandidatesLoading
	} from "@/lib/features/wayfarerMap.svelte";
	import { goto } from "$app/navigation";
	import { closeMenu } from "@/lib/ui/menus.svelte";
	import { getMapPath } from "@/lib/utils/getMapPath";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import type maplibre from "maplibre-gl";

	let {
		map
	}: {
		map: maplibre.Map | undefined;
	} = $props();

	let loading = $derived(getCandidatesLoading());

	function fetchCandidates() {
		if (!map) return;
		fetchCandidatesForCurrentBounds(map);
	}
</script>

<div
	class="pl-4 pr-2 py-2 flex flex-wrap gap-2 items-center justify-between bg-card rounded-lg border border-border"
>
	<div class="flex items-center gap-2">
		<h1 class="font-semibold">
			{m.nav_wayfarer()}
		</h1>
	</div>

	{#if getConfig().general.customHome && !getWayfarerInvokedFromMap()}
		<Button size="sm" variant="outline" tag="a" href="/" onclick={() => closeMenu()}>
			<ArrowLeft class="size-4" />
			<span>{m.error_back_to_website()}</span>
		</Button>
	{:else}
		<Button
			size="sm"
			variant="outline"
			onclick={() => {
				goto(getMapPath(getConfig()));
			}}
		>
			<ArrowLeft class="size-4" />
			<span>{m.back_to_map()}</span>
		</Button>
	{/if}
</div>

{#if isSupportedFeature("overpass")}
	<div class="flex justify-center mt-1.5">
		<Button size="sm" variant="secondary" disabled={!map || loading} onclick={fetchCandidates}>
			{#if loading}
				<Loader2 class="size-4 animate-spin" />
				<span>{m.wayfarer_candidates_loading()}</span>
			{:else}
				<Sparkles class="size-4" />
				<span>{m.wayfarer_candidates_button()}</span>
			{/if}
		</Button>
	</div>
{/if}
