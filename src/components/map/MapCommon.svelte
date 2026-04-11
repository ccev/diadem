<script lang="ts">
	import { MapLibre } from "svelte-maplibre";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte.js";
	import { type Snippet } from "svelte";
	import { handleRotatePitchDisable } from "@/lib/map/map.svelte";
	import { onMapMove, onMapStyleDataLoading } from "@/lib/map/events";
	import maplibre from "maplibre-gl";
	import { isAnyModalOpen } from "@/lib/ui/modal.svelte.js";
	import { getMapStyle, mapStyleFromId } from "@/lib/utils/mapStyle";
	import { getConfig } from "@/lib/services/config/config";
	import type { Coords } from "@/lib/utils/coordinates";

	let {
		onload = undefined,
		children = undefined,
		map = $bindable(),
		initialCenter,
		initialZoom
	}: {
		onload?: (map: maplibre.Map) => void;
		children?: Snippet;
		map?: maplibre.Map | undefined;
		initialCenter: Coords;
		initialZoom: number;
	} = $props();

	function onMapLoad(map: maplibre.Map) {
		if (!map) return;

		map.on("styledataloading", onMapStyleDataLoading);
		map.on("move", onMapMove); // needed for compass fab
		handleRotatePitchDisable();

		onload && onload(map);
	}
</script>

<MapLibre
	bind:map
	center={initialCenter.maplibre()}
	zoom={initialZoom}
	class="h-screen w-full overflow-hidden"
	style={getMapStyle(mapStyleFromId(getUserSettings().mapStyle.id))}
	attributionControl={false}
	interactive={!isAnyModalOpen()}
	onload={onMapLoad}
	minZoom={getConfig().general.minZoom}
	maxZoom={getConfig().general.maxZoom}
>
	{@render children?.()}
</MapLibre>
