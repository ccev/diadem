<script lang="ts">
	import { resetMap } from "@/lib/map/map.svelte";
	import BaseFab from "@/components/ui/fab/BaseFab.svelte";
	import LocateFab from "@/components/ui/fab/LocateFab.svelte";
	import { Navigation2 } from "lucide-svelte";
	import { getSkew, isMapSkewed } from "@/lib/map/mapSkew.svelte";
	import { fade, slide } from "svelte/transition";
	import maplibre from "maplibre-gl";
	import SearchFab from "@/components/ui/fab/SearchFab.svelte";

	let {
		map,
		showSearch = true,
		allowFollow = false,
		searchMode = "main"
	}: {
		map: maplibre.Map | undefined;
		showSearch?: boolean;
		allowFollow?: boolean;
		searchMode?: "main" | "coverage";
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
		<SearchFab {searchMode} />
	{/if}

	<LocateFab {map} {allowFollow} />
</div>
