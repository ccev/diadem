<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { getMap } from "@/lib/map/map.svelte";
	import { openPopup } from "@/lib/mapObjects/interact";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { getPopupFitPadding } from "@/lib/mapObjects/popupVisibility.svelte";
	import * as m from "@/lib/paraglide/messages";
	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { formatDistance, formatDuration } from "@/lib/utils/numberFormat";
	import { getRouteBounds, getRouteColor } from "@/lib/utils/routeUtils";
	import type { LucideIcon } from "@/lib/types/lucide";
	import { Clock, MapPinned, Ruler } from "@lucide/svelte";

	let {
		route,
		originFortId = undefined
	}: {
		route: RouteData;
		originFortId?: string;
	} = $props();

	let reverseDirection = $derived(route.reversible && originFortId === route.end.id);
	let end = $derived(reverseDirection ? route.start : route.end);
	let endName = $derived(
		end.name ?? (end.type === MapObjectType.GYM ? m.unknown_gym() : m.unknown_pokestop())
	);
	let routeMetrics: { Icon: LucideIcon; title: string; value: string }[] = $derived([
		{
			Icon: Ruler,
			title: m.route_distance(),
			value: formatDistance(route.distance_meters)
		},
		{
			Icon: Clock,
			title: m.route_duration(),
			value: formatDuration(route.duration_seconds)
		}
	]);

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

<div class="mt-3 grid grid-cols-2 gap-3">
	{#each routeMetrics as { Icon, title, value } (title)}
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
		{#if end.image}
			<ImagePopup
				src={end.image}
				alt={endName}
				class="size-11 shrink-0 rounded-full object-cover outline-offset-2 outline-2"
				style="outline-color: {getRouteColor(route)}"
			/>
		{:else}
			<div
				class="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-highlight"
			>
				<MapPinned class="size-6 text-muted-foreground" />
			</div>
		{/if}

		<div class="min-w-0">
			<p class="text-sm font-medium text-muted-foreground">
				{m.route_leads_to()}
			</p>
			<p class="font-medium text-base line-clamp-2">{endName}</p>
		</div>
	</div>
</div>

<Button variant="link" class="mb-2 w-full mt-auto" onclick={showRoutePopup}>
	<MapPinned class="size-3.5" />
	{m.show_route()}
</Button>
