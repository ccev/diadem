<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import ExpandableDescription from "@/components/ui/popups/common/ExpandableDescription.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { getMap } from "@/lib/map/map.svelte";
	import { openPopup } from "@/lib/mapObjects/interact";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { getPopupFitPadding } from "@/lib/mapObjects/popupVisibility.svelte";
	import * as m from "@/lib/paraglide/messages";
	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { formatRouteDistance, formatRouteDuration } from "@/lib/utils/routeFormat";
	import { getRouteBounds } from "@/lib/utils/routeUtils";
	import { mRouteTag } from "@/lib/services/ingameLocale";
	import { Clock, MapPinned, Ruler } from "@lucide/svelte";
	import OverviewCard from "@/components/ui/popups/common/OverviewCard.svelte";

	let {
		route,
		originFortId = undefined
	}: {
		route: RouteData;
		originFortId?: string;
	} = $props();

	let reverseDirection = $derived(route.reversible && originFortId === route.end_fort_id);
	let endType = $derived(reverseDirection ? route.start_fort_type : route.end_fort_type);
	let endName = $derived(
		(reverseDirection ? route.start_name : route.end_name) ??
			(endType === MapObjectType.GYM ? m.unknown_gym() : m.unknown_pokestop())
	);
	let endImage = $derived(reverseDirection ? route.start_image : route.end_image);

	function fitRoute() {
		const map = getMap();
		if (!map) return;
		map.fitBounds(getRouteBounds(route), { padding: getPopupFitPadding(), maxZoom: 17 });
	}

	function showRoutePopup() {
		openPopup(route);
		fitRoute();
	}
</script>

<h3 class="font-semibold wrap-break-word text-lg">
	{route.name || m.unknown_route()}
</h3>
{#if route.shortcode}
	<p class="text-xs font-medium text-muted-foreground">{route.shortcode}</p>
{/if}

<div class="mt-3 grid grid-cols-2 gap-3">
	{#each [[Ruler, m.route_distance(), formatRouteDistance(route.distance_meters)], [Clock, m.route_duration(), formatRouteDuration(route.duration_seconds)]] as [Icon, title, value]}
		<div class="border bg-accent-highlight border-border rounded-lg px-3 py-2">
			<h2 class="flex items-center gap-1 text-muted-foreground text-sm font-semibold mb0.5">
				<Icon class="size-3.5" />
				{title}
			</h2>

			<p class="font-semibold text-lg">
				{value}
			</p>
		</div>
	{/each}
</div>

<div class="mt-4">
	<div class="flex items-center gap-3 w-full">
		{#if endImage}
			<ImagePopup src={endImage} alt={endName} class="size-11 shrink-0 rounded-full object-cover" />
		{:else}
			<div
				class="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-highlight"
			>
				<MapPinned class="size-6 text-muted-foreground" />
			</div>
		{/if}

		<div class="min-w-0">
			<p class="text-sm font-medium text-muted-foreground">
				{m.route_leads_to()}
			</p>
			<p class="wrap-break-word font-medium text-base">{endName}</p>
		</div>
	</div>
</div>

<Button variant="link" class="mb-2 w-full mt-auto" onclick={showRoutePopup}>
	<MapPinned class="size-3.5" />
	{m.show_route()}
</Button>
