<script lang="ts">
	import { Marker } from "svelte-maplibre";
	import { getAnimateLocationMarker, getCurrentLocation } from "@/lib/map/geolocate.svelte";
</script>

{#if getCurrentLocation()}
	<Marker lngLat={getCurrentLocation() ?? [0, 0]}>
		<div class="relative size-4 rounded-full bg-sky-500 outline-white outline-4">
			{#if getAnimateLocationMarker()}
				<div
					class="absolute left-1/2 top-1/2 -translate-1/2 bg-sky-500/75 size-5 rounded-full duration-1500 animate-ping"
				></div>
			{/if}
		</div>
	</Marker>
{/if}
