<script lang="ts">
	import BaseFab from '@/components/ui/fab/BaseFab.svelte';
	import { Locate, LocateOff } from 'lucide-svelte';
	import { updateGeolocationEnabled, updateLocation, getIsGeolocationEnabled, getIsFetchingLocation } from '@/lib/map/geolocate.svelte';
	import { onMount } from 'svelte';

	onMount(() => updateGeolocationEnabled().then())
</script>


<BaseFab
	onclick={updateLocation}
>
	{#if getIsGeolocationEnabled()}
		<Locate size="24" class={getIsFetchingLocation() ? "fetching-location" : ""} />
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