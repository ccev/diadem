<script lang="ts">
	import { resetMap } from "@/lib/map/map.svelte";
	import BaseFab from "@/components/ui/fab/BaseFab.svelte";
	import LocateFab from "@/components/ui/fab/LocateFab.svelte";
	import { Navigation2 } from "@lucide/svelte";
	import { getSkew, isMapSkewed } from "@/lib/map/mapSkew.svelte";
	import { fade, slide } from "svelte/transition";
	import maplibre from "maplibre-gl";
	import SearchFab from "@/components/ui/fab/SearchFab.svelte";
	import MapStyleFab from "@/components/ui/fab/MapStyleFab.svelte";
	import type { MapStyle } from "@/lib/services/config/configTypes";

	let {
		map,
		showSearch = true,
		allowFollow = false,
		allowMapStyle = false,
		searchMode = "main",
		getStyleId = undefined,
		setStyle = undefined
	}: {
		map: maplibre.Map | undefined;
		showSearch?: boolean;
		allowFollow?: boolean;
		allowMapStyle?: boolean;
		searchMode?: "main" | "coverage" | "wayfarer";
		getStyleId?: () => string | undefined;
		setStyle?: (style: MapStyle) => void;
	} = $props();
</script>

<div class="mx-2 gap-2 flex-col flex items-center" hidden={!map} transition:fade={{ duration: 90 }}>
	{#if isMapSkewed()}
		<div transition:slide={{ duration: 120 }}>
			<BaseFab onclick={() => resetMap(map)} class="rounded-full!">
				<Navigation2
					size="24"
					style="transform: rotateX({getSkew().pitch}deg) rotateZ({-getSkew().bearing}deg);"
				/>
			</BaseFab>
		</div>
	{/if}

	{#if showSearch}
		<SearchFab {searchMode} {map} />
	{/if}

	{#if allowMapStyle}
		<MapStyleFab {getStyleId} {setStyle} />
	{/if}

	<LocateFab {map} {allowFollow} />
</div>
