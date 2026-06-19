<script lang="ts">
	import { m } from "@/lib/paraglide/messages";
	import Fabs from "@/components/ui/fab/Fabs.svelte";
	import { setIsContextMenuOpen } from "@/lib/ui/contextmenu.svelte.js";
	import { isWebglSupported } from "@/lib/map/utils";
	import ErrorPageWebGl from "@/components/ui/ErrorPageWebGl.svelte";
	import { onMount, tick } from "svelte";
	import MapMenuUi from "@/components/ui/MapMenuUi.svelte";
	import type maplibre from "maplibre-gl";
	import { fly } from "svelte/transition";
	import { clearMapPositionUrlParams } from "$lib/map/mapPositionParams.svelte";
	import { useMetadata } from "@/lib/ui/metadata.svelte";
	import MapWayfarer from "@/components/map/MapWayfarer.svelte";
	import WayfarerFortPopup from "@/components/menus/wayfarer/WayfarerFortPopup.svelte";
	import WayfarerCellPopup from "@/components/menus/wayfarer/WayfarerCellPopup.svelte";
	import WayfarerTitle from "@/components/menus/wayfarer/WayfarerTitle.svelte";
	import { getWayfarerStyleId, setWayfarerStyle } from "@/lib/features/wayfarerMap.svelte";

	let map: maplibre.Map | undefined = $state(undefined);

	useMetadata(() => ({ title: m.nav_wayfarer() }));

	onMount(async () => {
		await tick();
		setIsContextMenuOpen(false);
		clearMapPositionUrlParams();
	});
</script>

{#if !isWebglSupported()}
	<ErrorPageWebGl />
{:else}
	<MapMenuUi>
		{#snippet desktopRight()}
			<Fabs
				{map}
				searchMode="wayfarer"
				allowMapStyle={true}
				getStyleId={getWayfarerStyleId}
				setStyle={setWayfarerStyle}
			/>

			<WayfarerFortPopup />
			<WayfarerCellPopup />
		{/snippet}

		{#snippet mobileBottom()}
			<Fabs
				{map}
				searchMode="wayfarer"
				allowMapStyle={true}
				getStyleId={getWayfarerStyleId}
				setStyle={setWayfarerStyle}
			/>

			<WayfarerFortPopup />
			<WayfarerCellPopup />
		{/snippet}
	</MapMenuUi>

	<div
		class="fixed top-[calc(0.5rem+env(safe-area-inset-top))] left-0 right-0 z-20 px-2 max-w-md"
		transition:fly={{ duration: 90, y: -14 }}
	>
		<WayfarerTitle />
	</div>

	<MapWayfarer bind:map />
{/if}
