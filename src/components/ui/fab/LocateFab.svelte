<script lang="ts">
	import BaseFab from '@/components/ui/fab/BaseFab.svelte';
	import { Locate, LocateOff } from 'lucide-svelte';
	import {openModal} from '@/lib/modal.svelte';
	import maplibre from "maplibre-gl"
	import {checkGeolocationSupport} from "maplibre-gl/src/util/geolocation_support"
	import { onMount } from 'svelte';

	let {
		map
	}: {
		map: maplibre.Map | undefined
	} = $props()

	let geolocationEnabled: boolean = $state(false)
	let isFetchingLocation: boolean = $state(false)
	const geolocate = new  maplibre.GeolocateControl({ trackUserLocation: false, showAccuracyCircle: false })

	function updateGeolocationEnabled() {
		checkGeolocationSupport().then(r => geolocationEnabled = r)
	}

	function onClick() {
		updateGeolocationEnabled()
		isFetchingLocation = true
		navigator?.geolocation?.getCurrentPosition(
			(s) => {
				isFetchingLocation = false
				geolocate._onSuccess(s)
			},
			(e) => {
				geolocationEnabled = false
				isFetchingLocation = false
				geolocate._onError(e)
			},
			{
				enableHighAccuracy: true
			}
		)
	}

	$effect(() => {
		updateGeolocationEnabled()
		if (map) geolocate.onAdd(map)
	})

</script>


<BaseFab
	onclick={onClick}
>
	{#if geolocationEnabled}
		<Locate size="24" class={isFetchingLocation ? "fetching-location" : ""} />
	{:else}
		<LocateOff size="24" />
	{/if}
</BaseFab>

<style lang="postcss">
    @keyframes pulse {
        50% {
            @apply text-muted-foreground;
        }
    }
    :global(.fetching-location) {
		animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;

	}
</style>