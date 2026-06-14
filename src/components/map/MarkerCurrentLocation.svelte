<script lang="ts">
	import { Marker } from "svelte-maplibre";
	import { getCurrentLocation } from "@/lib/map/geolocate.svelte";
	import { scale, fly } from "svelte/transition";

	let location = $derived(getCurrentLocation());
</script>

{#if location}
	<Marker lngLat={location}>
		<div
			style:--color-marker="var(--color-blue-600)"
			class="relative size-3 rounded-full bg-(--color-marker) outline-blue-300/60 outline-6"
			transition:scale|global={{ duration: 100 }}
		>
			{#if location.heading !== undefined}
				<div
					class="heading-cone absolute left-1/2 top-1/2 size-0 origin-center transition-transform ease-in-out duration-5000"
					style:transform={`rotate(${location.heading}deg)`}
					transition:fly|global={{ duration: 200, y: 6 }}
				>
					<div
						class="direction-cone w-30 h-18 -bottom-1.5"
						transition:fly|global={{ duration: 200, y: 6 }}
					></div>
				</div>
			{/if}
			<div
				class="absolute left-1/2 top-1/2 -translate-1/2 bg-(--color-marker)/50 size-4.5 rounded-full locate"
			></div>
		</div>
	</Marker>
{/if}

<style lang="postcss">
	.locate {
		animation: locate 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes locate {
		50% {
			transform: scale(0.85);
			opacity: 0.5;
		}
	}

	.heading-cone {
		transition: transform 500ms ease-in-out;
		will-change: transform;
	}

	.direction-cone {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		transform-origin: 50% 100%;
		pointer-events: none;
		clip-path: polygon(50% 100%, 10% 0, 90% 0);
	}

	.direction-cone::after {
		content: "";
		position: absolute;
		inset: 0;
		clip-path: polygon(50% 100%, 10% 0, 90% 0);
		background: radial-gradient(
			ellipse at 50% 100%,
			color-mix(in oklab, var(--color-marker) 50%, transparent),
			transparent 58%
		);
	}
</style>
