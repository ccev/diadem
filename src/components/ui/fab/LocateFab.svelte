<script lang="ts">
	import BaseFab from "@/components/ui/fab/BaseFab.svelte";
	import { Locate, LocateFixed, LocateOff } from "lucide-svelte";
	import {
		updateGeolocationEnabled,
		updateLocation,
		getIsGeolocationEnabled,
		getIsFetchingLocation,
		getIsLocateFollowing
	} from "@/lib/map/geolocate.svelte";
	import { onMount } from "svelte";
	import type maplibre from "maplibre-gl";

	let {
		map,
		allowFollow = false
	}: {
		map: maplibre.Map | undefined;
		allowFollow?: boolean;
	} = $props();

	onMount(() => updateGeolocationEnabled().then());
</script>

<BaseFab onclick={() => updateLocation(map, allowFollow)}>
	{#if getIsGeolocationEnabled()}
		{#if getIsLocateFollowing()}
			<LocateFixed size="24" />
		{:else}
			<Locate size="24" class={getIsFetchingLocation() ? "fetching-location" : ""} />
		{/if}
	{:else}
		<LocateOff size="24" />
	{/if}
</BaseFab>

<style lang="postcss">
	@keyframes pulse {
		50% {
			color: var(--muted-foreground);
		}
	}
	:global(.fetching-location) {
		animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
