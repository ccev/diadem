<script lang="ts">
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { getCurrentSelectedData, getCurrentSelectedMapId } from "@/lib/mapObjects/currentSelectedState.svelte";
	import BasePopup from "@/components/ui/popups/BasePopup.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { getRoutesAtFort } from "@/lib/map/featuresGen.svelte";
	import { openPopup } from "@/lib/mapObjects/interact";
	import { getRouteAnchorFortId } from "@/lib/map/routePaths.svelte";

	let data: RouteData = $derived(getMapObjects()[getCurrentSelectedMapId()] as RouteData ?? getCurrentSelectedData() as RouteData);

	let anchorFortId = $derived(getRouteAnchorFortId());
	let routes: RouteData[] = $derived(anchorFortId ? getRoutesAtFort(anchorFortId) : [data]);

	// Use the anchor fort's position so popup doesn't jump when switching routes
	let anchorLat: number = $state(0);
	let anchorLon: number = $state(0);
	let currentAnchorFortId: string | null = $state(null);

	$effect(() => {
		const fortId = anchorFortId;
		if (!fortId || fortId === currentAnchorFortId) return;
		currentAnchorFortId = fortId;
		const firstRoute = routes[0];
		if (firstRoute) {
			// Determine position from the fort: check if it's a start or end location
			if (firstRoute.start_fort_id === fortId) {
				anchorLat = firstRoute.start_lat;
				anchorLon = firstRoute.start_lon;
			} else {
				anchorLat = firstRoute.end_lat;
				anchorLon = firstRoute.end_lon;
			}
		}
	});

	function selectRoute(route: RouteData) {
		openPopup(route);
	}
</script>

<BasePopup lat={anchorLat} lon={anchorLon}>
	{#snippet image()}
		<ImagePopup
			alt={data.name}
			src={data.image}
			class="w-12 h-12"
		/>
	{/snippet}

	{#snippet title()}
		{data.name}
	{/snippet}

	{#snippet description()}
		{data.description}
	{/snippet}

	{#snippet content()}
		{#if routes.length > 1}
			<div class="flex flex-col gap-1 mb-3">
				{#each routes as route (route.mapId)}
					<button
						class="flex items-center gap-2 px-3 py-1.5 rounded text-left text-sm transition-colors
							{route.mapId === data.mapId
								? 'bg-accent/20 font-medium'
								: 'opacity-60 hover:opacity-100 hover:bg-accent/10'}"
						onclick={() => selectRoute(route)}
					>
						<span
							class="w-2.5 h-2.5 rounded-full shrink-0"
							style="background-color: {route.mapId === data.mapId ? '#FF6600' : '#888888'}"
						></span>
						{route.name}
					</button>
				{/each}
			</div>
		{/if}
		<p class="text-sm opacity-80">{data.description}</p>
	{/snippet}
</BasePopup>
