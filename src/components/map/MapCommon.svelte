<script lang="ts">
	import { MapLibre } from "svelte-maplibre";
	import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
	import { onDestroy, type Snippet } from "svelte";
	import { on } from "svelte/events";
	import { handleRotatePitchDisable } from "@/lib/map/map.svelte";
	import { onMapMove, onMapStyleLoad } from "@/lib/map/events";
	import type * as maplibre from "maplibre-gl";
	import { isAnyModalOpen } from "@/lib/ui/modal.svelte.js";
	import { getMapStyle, mapStyleFromId } from "@/lib/utils/mapStyle";
	import { getConfig } from "@/lib/services/config/config";
	import type { Coords } from "@/lib/utils/coordinates";
	import { closeMenu } from "@/lib/ui/menus.svelte";
	import { clearActiveSearchFilter } from "@/lib/features/activeSearch.svelte.js";
	import { setCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
	import { resetLocate } from "@/lib/map/geolocate.svelte";
	import MapAttribution from "@/components/map/MapAttribution.svelte";

	let {
		onload = undefined,
		children = undefined,
		map = $bindable(),
		initialCenter,
		initialZoom,
		style,
		showAttribution = true
	}: {
		onload?: (map: maplibre.Map) => void;
		children?: Snippet;
		map?: maplibre.Map | undefined;
		initialCenter: Coords;
		initialZoom: number;
		style?: string | maplibre.StyleSpecification;
		showAttribution?: boolean;
	} = $props();

	function onMapLoad(map: maplibre.Map) {
		if (!map) return;

		// Firefox can natively drag a page selection containing the canvas instead of panning.
		const stopNativeDrag = on(map.getCanvas(), "dragstart", (event) => event.preventDefault());
		map.once("remove", stopNativeDrag);

		map.on("style.load", onMapStyleLoad);
		map.on("move", onMapMove); // needed for compass fab
		handleRotatePitchDisable(map);

		onload && onload(map);
	}

	onDestroy(() => {
		closeMenu();
		clearActiveSearchFilter();
		setCurrentSelectedData(null);
		resetLocate();
	});
</script>

<MapLibre
	bind:map
	center={initialCenter.maplibre()}
	zoom={initialZoom}
	class="h-svh! h-screen w-full overflow-hidden"
	style={style ?? getMapStyle(mapStyleFromId(getUserSettings().mapStyle.id))}
	attributionControl={false}
	interactive={!isAnyModalOpen()}
	onload={onMapLoad}
	minZoom={getConfig().general.minZoom}
	maxZoom={getConfig().general.maxZoom}
>
	{@render children?.()}
	{#if showAttribution}
		<MapAttribution {map} />
	{/if}
</MapLibre>
