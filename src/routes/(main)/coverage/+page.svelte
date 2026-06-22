<script lang="ts">
	import { m } from "@/lib/paraglide/messages";
	import MapCoverage from "@/components/map/MapCoverage.svelte";
	import { closeMenu, Menu, openMenu } from "@/lib/ui/menus.svelte.js";
	import Fabs from "@/components/ui/fab/Fabs.svelte";
	import { setIsContextMenuOpen } from "@/lib/ui/contextmenu.svelte.js";
	import { isWebglSupported } from "@/lib/map/utils";
	import {
		coverageMapActiveSnapPoint,
		coverageMapSnapPoints,
		showCoverageMapTitle
	} from "@/lib/features/coverageMap.svelte.js";
	import ErrorPageWebGl from "@/components/ui/ErrorPageWebGl.svelte";
	import { onDestroy, onMount, tick } from "svelte";
	import { closePopup } from "@/lib/mapObjects/interact";
	import MapMenuUi from "@/components/ui/MapMenuUi.svelte";
	import type maplibre from "maplibre-gl";
	import { fly } from "svelte/transition";
	import CoverageMapTitle from "@/components/menus/coverageMap/CoverageMapTitle.svelte";
	import { isMenuSidebar, isUiLeft } from "@/lib/utils/device";
	import CoverageMapPopup from "@/components/menus/coverageMap/CoverageMapPopup.svelte";
	import { setMap } from "@/lib/map/map.svelte";
	import CoverageMapMenu from "@/components/menus/coverageMap/CoverageMapMenu.svelte";
	import { clearMapPositionUrlParams } from "$lib/map/mapPositionParams.svelte";
	import { useMetadata } from "@/lib/ui/metadata.svelte";

	let map: maplibre.Map | undefined = $state(undefined);
	openMenu(Menu.COVERAGE_MAP);
	useMetadata(() => ({ title: m.nav_coveragemap() }));

	onMount(async () => {
		await tick();
		setMap(undefined);
		openMenu(Menu.COVERAGE_MAP);
		closePopup();
		setIsContextMenuOpen(false);
		clearMapPositionUrlParams();
	});

	onDestroy(() => {
		closeMenu();
	});
</script>

{#if !isWebglSupported()}
	<ErrorPageWebGl />
{:else}
	<MapMenuUi>
		{#snippet desktopLeft()}
			<!--			<DesktopMenu />-->
		{/snippet}
		{#snippet desktopRight()}
			<Fabs {map} searchMode="coverage" />
			<div class="px-2 -mt-2">
				<CoverageMapPopup />
			</div>
		{/snippet}

		{#snippet mobileBottom()}
			{#if coverageMapActiveSnapPoint.value === coverageMapSnapPoints[0]}
				<div
					in:fly={{ x: isUiLeft() ? -20 : 20, duration: 70, delay: 100 }}
					out:fly={{ x: isUiLeft() ? -20 : 20, duration: 70 }}
				>
					<Fabs {map} searchMode="coverage" />
				</div>

				<div
					class="px-2 w-full -mt-2"
					in:fly={{ duration: 100, y: -30, delay: 100 }}
					out:fly={{ duration: 200, y: -200 }}
				>
					<CoverageMapPopup />
				</div>

				<!-- subtract the safe-area inset the mobile UI container adds, so the popup
				     sits just above the (non-inset) menu drawer instead of leaving a gap -->
				<div
					style:height="calc({coverageMapSnapPoints[0]} - 8px - env(safe-area-inset-bottom))"
				></div>
			{/if}
		{/snippet}

		{#snippet mobileTop()}
			{#if showCoverageMapTitle()}
				<div class="fixed top-safe-inset-top z-20 w-full px-2" transition:fly={{ duration: 90, y: -14 }}>
					<CoverageMapTitle />
				</div>
			{/if}
		{/snippet}
	</MapMenuUi>

	<div class="flex">
		{#if isMenuSidebar()}
			<div class="w-[40%] max-w-lg min-w-xs shrink-0 overflow-y-auto max-h-screen px-2">
				<div class="w-full px-2 pt-4 top-0 sticky z-10 bg-background">
					<CoverageMapTitle />
				</div>
				<CoverageMapMenu />
			</div>
		{/if}
		<MapCoverage bind:map />
	</div>
{/if}
