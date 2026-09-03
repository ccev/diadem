<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { openPopup } from "@/lib/mapObjects/interact";
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import * as m from "@/lib/paraglide/messages";
	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { getRouteEndpointFort } from "@/lib/utils/routeUtils";
	import { ArrowRight, MapPinned } from "@lucide/svelte";

	let {
		route,
		endpoint,
		label = endpoint
	}: {
		route: RouteData;
		endpoint: "start" | "end";
		label?: "start" | "end";
	} = $props();

	let isEnd = $derived(endpoint === "end");
	let routeEndpoint = $derived(isEnd ? route.end : route.start);
	let fortName = $derived(
		routeEndpoint.name ??
			(routeEndpoint.type === MapObjectType.GYM ? m.unknown_gym() : m.unknown_pokestop())
	);
	let fort = $derived(
		getMapObjects()[`${routeEndpoint.type}-${routeEndpoint.id}`] ??
			getRouteEndpointFort([route], routeEndpoint.id)
	);
</script>

<Button
	variant=""
	size=""
	class="flex items-center justify-start! text-left! gap-3 py-4! px-3! w-full whitespace-normal!"
	onclick={() => fort && openPopup(fort)}
>
	{#if routeEndpoint.image}
		<ImagePopup
			src={routeEndpoint.image}
			alt={fortName}
			class="size-14 shrink-0 rounded-full object-cover"
		/>
	{:else}
		<div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-highlight">
			<MapPinned class="size-6 text-muted-foreground" />
		</div>
	{/if}

	<div class="min-w-0">
		<p class="text-sm font-semibold text-muted-foreground">
			{label === "end" ? m.end() : m.start()}
		</p>
		<p class="wrap-break-word font-semibold text-lg">{fortName}</p>
	</div>

	<ArrowRight class="size-4 text-muted-foreground ml-auto" />
</Button>
