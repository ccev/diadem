<script lang="ts">
	import { Marker } from 'svelte-maplibre';
	import { getAnimateLocationMarker, getCurrentLocation } from '@/lib/map/geolocate.svelte';
	import { getSearchedLocation } from "@/lib/services/search.svelte";
	import {fade,scale} from "svelte/transition";

	let location = $derived(getSearchedLocation())
</script>

{#if location}
	<Marker lngLat={location.maplibre()}>
		<div
			class="relative size-5 rounded-full bg-pink-200 outline-white outline-2"

		>
			<div
				class="absolute left-1/2 top-1/2 -translate-1/2 bg-rose-500 size-5 rounded-full duration-2500 animate-pulse"
			></div>
		</div>
	</Marker>

{/if}