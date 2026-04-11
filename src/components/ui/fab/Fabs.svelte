<script lang="ts">
	import { getMap, resetMap } from "@/lib/map/map.svelte";
	import { isAnyModalOpen, isOpenModal } from "@/lib/ui/modal.svelte.js";
	import Search from "@/components/ui/search/Search.svelte";
	import BaseFab from "@/components/ui/fab/BaseFab.svelte";
	import LocateFab from "@/components/ui/fab/LocateFab.svelte";
	import { Navigation2, Search as SearchIcon } from "lucide-svelte";
	import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte.js";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import { getSkew, isMapSkewed } from "@/lib/map/mapSkew.svelte";
	import { fade, slide } from "svelte/transition";
	import { isSearchViewActive } from "@/lib/features/activeSearch.svelte.js";
	import { initSearch, openSearchModal } from "@/lib/services/search.svelte";
	import maplibre from "maplibre-gl";

	let {
		map,
		showSearch = true
	}: {
		map: maplibre.Map | undefined;
		showSearch?: boolean;
	} = $props();

	let isSearchAllowed = $derived(
		showSearch &&
			!isSearchViewActive() &&
			hasLoadedFeature(
				LoadedFeature.SUPPORTED_FEATURES,
				LoadedFeature.REMOTE_LOCALE,
				LoadedFeature.ICON_SETS,
				LoadedFeature.MASTER_FILE,
				LoadedFeature.MASTER_STATS,
				LoadedFeature.USER_DETAILS
			) &&
			(!isSupportedFeature("koji") || hasLoadedFeature(LoadedFeature.KOJI))
	);

	$effect(() => {
		if (isSearchAllowed) initSearch();
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "k" && (e.metaKey || e.ctrlKey) && isSearchAllowed && !isAnyModalOpen()) {
			e.preventDefault();
			openSearchModal();
		}
	}
</script>

<svelte:document onkeydown={handleKeydown} />

{#if isOpenModal("search")}
	<Search />
{/if}

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

	{#if isSearchAllowed}
		<BaseFab onclick={() => openSearchModal()}>
			<SearchIcon size="24" />
		</BaseFab>
	{/if}

	<LocateFab {map} />
</div>
