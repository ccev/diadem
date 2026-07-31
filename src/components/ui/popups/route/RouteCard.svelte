<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import {
		getFocusedRouteMapId,
		setFocusedRouteMapId
	} from "@/lib/features/routes/routeDisplay.svelte";
	import { refreshRouteFeatures } from "@/lib/map/featuresGen.svelte";
	import { getMap } from "@/lib/map/map.svelte";
	import { getPopupFitPadding } from "@/lib/mapObjects/popupVisibility.svelte";
	import * as m from "@/lib/paraglide/messages";
	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { resetPopupBaseDrawerSnapPoint } from "@/lib/ui/popupDrawer.svelte";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { formatNumber } from "@/lib/utils/numberFormat";
	import { getRouteCoordinates } from "@/lib/utils/routeUtils";
	import { ArrowLeftRight, ArrowRight, Clock, MapPinned, Ruler, Signpost } from "@lucide/svelte";
	import maplibre from "maplibre-gl";

	let {
		route,
		originFortId = undefined
	}: {
		route: RouteData;
		originFortId?: string;
	} = $props();

	let isFocused = $derived(getFocusedRouteMapId() === route.mapId);
	let showAllRoutes = $derived(getUserSettings().filters.route.enabled);
	let reverseDirection = $derived(route.reversible && originFortId === route.end_fort_id);
	let startName = $derived(
		(reverseDirection ? route.end_name : route.start_name) ?? m.unknown_pokestop()
	);
	let startImage = $derived(reverseDirection ? route.end_image : route.start_image);
	let endName = $derived(
		(reverseDirection ? route.start_name : route.end_name) ?? m.unknown_pokestop()
	);
	let endImage = $derived(reverseDirection ? route.start_image : route.end_image);

	function formatDistance(distance: number): string {
		if (distance < 1000) {
			return m.route_distance_meters({ distance: formatNumber(distance) });
		}
		return m.route_distance_kilometers({
			distance: formatNumber(distance / 1000, { maximumFractionDigits: 2 })
		});
	}

	function formatDuration(duration: number): string {
		const minutes = Math.max(1, Math.ceil(duration / 60));
		if (minutes < 60) return m.route_duration_minutes({ minutes });
		return m.route_duration_hours_minutes({
			hours: Math.floor(minutes / 60),
			minutes: minutes % 60
		});
	}

	function formatTag(tag: string): string {
		const label = tag.replace(/^route_tag_/, "").replaceAll("_", " ");
		return label.charAt(0).toUpperCase() + label.slice(1);
	}

	function toggleRoute() {
		const showRoute = !isFocused;
		setFocusedRouteMapId(showRoute ? route.mapId : null);
		refreshRouteFeatures();
		if (!showRoute) return;

		const map = getMap();
		resetPopupBaseDrawerSnapPoint();
		if (map) {
			const bounds = new maplibre.LngLatBounds();
			for (const coordinate of getRouteCoordinates(route)) {
				bounds.extend([coordinate[0], coordinate[1]]);
			}
			map.fitBounds(bounds, { padding: getPopupFitPadding(), maxZoom: 17 });
		}
	}
</script>

<div class="flex items-start gap-3">
	{#if route.image}
		<ImagePopup
			src={route.image}
			alt={route.name || m.pogo_route()}
			class="size-14 shrink-0 rounded-md object-cover"
		/>
	{:else}
		<div class="flex size-14 shrink-0 items-center justify-center rounded-md bg-accent-highlight">
			<Signpost class="size-6" />
		</div>
	{/if}
	<div class="min-w-0">
		<h3 class="font-semibold break-words">{route.name || m.unknown_route()}</h3>
		{#if route.shortcode}
			<p class="text-xs font-medium text-muted-foreground">{route.shortcode}</p>
		{/if}
		{#if route.description}
			<p class="mt-1 line-clamp-3 text-sm text-muted-foreground">{route.description}</p>
		{/if}
	</div>
</div>

<div class="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
	<div class="min-w-0 text-center">
		{#if startImage}
			<ImagePopup
				src={startImage}
				alt={startName}
				class="mx-auto size-12 rounded-full object-cover"
			/>
		{:else}
			<MapPinned class="mx-auto size-8 text-muted-foreground" />
		{/if}
		<p class="mt-1 line-clamp-2 text-xs font-medium">{startName}</p>
		<p class="text-xs text-muted-foreground">{m.start()}</p>
	</div>
	<ArrowRight class="size-4 text-muted-foreground" />
	<div class="min-w-0 text-center">
		{#if endImage}
			<ImagePopup src={endImage} alt={endName} class="mx-auto size-12 rounded-full object-cover" />
		{:else}
			<MapPinned class="mx-auto size-8 text-muted-foreground" />
		{/if}
		<p class="mt-1 line-clamp-2 text-xs font-medium">{endName}</p>
		<p class="text-xs text-muted-foreground">{m.end()}</p>
	</div>
</div>

<div class="mt-4 space-y-2 text-sm">
	<div class="flex items-center justify-between gap-3">
		<span class="flex items-center gap-1.5 text-muted-foreground"
			><Ruler class="size-3.5" />{m.route_distance()}</span
		>
		<span class="font-medium">{formatDistance(route.distance_meters)}</span>
	</div>
	<div class="flex items-center justify-between gap-3">
		<span class="flex items-center gap-1.5 text-muted-foreground"
			><Clock class="size-3.5" />{m.route_duration()}</span
		>
		<span class="font-medium">{formatDuration(route.duration_seconds)}</span>
	</div>
	<div class="flex items-center justify-between gap-3">
		<span class="flex items-center gap-1.5 text-muted-foreground"
			><ArrowLeftRight class="size-3.5" />{m.route_direction()}</span
		>
		<span class="font-medium">
			{#if route.reversible}
				{m.route_reversible()}
			{:else}
				{m.route_one_way()}
			{/if}
		</span>
	</div>
</div>

{#if route.tags.length > 0}
	<div class="mt-3 flex flex-wrap gap-1.5">
		{#each route.tags as tag (tag)}
			<span class="rounded-full bg-accent-highlight px-2 py-1 text-xs">{formatTag(tag)}</span>
		{/each}
	</div>
{/if}

<Button variant={isFocused ? "secondary" : "link"} class="mt-3 mb-2 w-full" onclick={toggleRoute}>
	<MapPinned class="size-3.5" />
	{#if isFocused}
		{#if showAllRoutes}
			{m.show_all_routes()}
		{:else}
			{m.hide_route()}
		{/if}
	{:else}
		{m.show_route()}
	{/if}
</Button>
