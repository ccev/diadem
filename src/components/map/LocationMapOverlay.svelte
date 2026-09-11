<script lang="ts">
	import GeometryLayer from "@/components/map/GeometryLayer.svelte";
	import { getCurrentLocation } from "@/lib/map/geolocate.svelte";
	import { getCurrentSelectedData } from "$lib/mapObjects/currentSelectedState.svelte";
	import { ClientMapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import { MapSourceId } from "$lib/map/layers";
	import { circle, featureCollection } from "@turf/turf";
	import { Marker } from "svelte-maplibre";
	import { scale, fly } from "svelte/transition";

	let location = $derived.by(() => {
		const selected = getCurrentSelectedData();
		return selected?.type === ClientMapObjectType.LOCATION ? selected : null;
	});

	let center = $derived.by(() => {
		if (!location) return undefined;
		if (location.isCurrentLocation) {
			const current = getCurrentLocation();
			if (current) return { lat: current.lat, lon: current.lng };
		}
		return { lat: location.lat, lon: location.lon };
	});

	let radiusData = $derived.by(() => {
		if (!center) return featureCollection([]);
		const centerPoint: [number, number] = [center.lon, center.lat];
		return featureCollection([
			circle(centerPoint, 0.08, {
				units: "kilometers",
				steps: 64,
				properties: { fillColor: "#3b82f6", strokeColor: "transparent" }
			}),
			circle(centerPoint, 0.04, {
				units: "kilometers",
				steps: 64,
				properties: { fillColor: "#a855f7", strokeColor: "transparent" }
			})
		]);
	});
</script>

<GeometryLayer id={MapSourceId.LOCATION_RADIUS} data={radiusData} fillOpacity={0.2} />

{#if location && !location.isCurrentLocation}
	<Marker lngLat={location}>
		<div
			style:--color-marker="var(--color-rose-600)"
			class="relative size-3.5 rounded-full bg-(--color-marker) outline-rose-300/60 outline-4"
			transition:scale|global={{ duration: 400 }}
		>
			<div
				class="absolute left-1/2 top-1/2 -translate-1/2 bg-(--color-marker)/50 size-4.5 rounded-full location-pulse"
			></div>
		</div>
	</Marker>
{/if}

<style>
	.location-pulse {
		animation: location-shrink 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes location-shrink {
		from {
			transform: scale(3);
			opacity: 0.1;
		}
		to {
			transform: scale(1);
			opacity: 0.5;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.location-pulse {
			animation: none;
			transform: translate(-50%, -50%) scale(0.65);
			opacity: 0.12;
		}
	}
</style>
