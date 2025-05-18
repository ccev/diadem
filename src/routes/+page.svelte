<script lang="ts">
	import { slide } from 'svelte/transition';
	import PokemonPopup from '@/components/ui/popups/pokemon/PokemonPopup.svelte';
	import PokestopPopup from '@/components/ui/popups/pokestop/PokestopPopup.svelte';
	import LocateFab from '@/components/ui/fab/LocateFab.svelte';
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
	import { getUserSettings } from '@/lib/userSettings.svelte';
	import Map from '@/components/map/Map.svelte';
	import ContextMenu from '@/components/ui/contextmenu/ContextMenu.svelte';
	import { getConfig } from '@/lib/config/config';
	import GymPopup from '@/components/ui/popups/gym/GymPopup.svelte';
	import StationPopup from '@/components/ui/popups/station/StationPopup.svelte';
	import { getCurrentSelectedData, getCurrentSelectedMapId } from '@/lib/mapObjects/currentSelectedState.svelte';
	import { getMap, resetMap } from '@/lib/map/map.svelte';
	import WeatherOverview from '@/components/map/WeatherOverview.svelte';
	import { Search as SearchIcon } from 'lucide-svelte';
	import Search from '@/components/ui/search/Search.svelte';
	import { openModal } from '@/lib/modal.svelte';
	import BaseFab from '@/components/ui/fab/BaseFab.svelte';

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			openModal(searchModalSnippet, "top")
		}
	}
</script>

<svelte:head>
	<title>{getConfig().general.mapName}</title>
</svelte:head>

<svelte:document onkeydown={handleKeydown} />

{#snippet searchModalSnippet()}
	<Search/>
{/snippet}

<ContextMenu />
<WeatherOverview />

<div
	class="fixed z-10 bottom-2 w-full flex flex-col pointer-events-none"
	class:items-end={!getUserSettings().isLeftHanded}
	class:items-start={getUserSettings().isLeftHanded}
>
	{#if getMap()}
		<div
			class="mx-2 gap-2 mb-2 flex-col flex"
		>
			<BaseFab onclick={() => openModal(searchModalSnippet, "top")}>
				<SearchIcon size="24" />
			</BaseFab>

			<LocateFab />

		</div>
	{/if}

	{#if getCurrentSelectedData()}
		<div
			class="w-full max-w-[30rem] mb-2 z-10"
			style="pointer-events: all"
			transition:slide={{duration: 50}}
		>
			{#if getCurrentSelectedData().type === "pokemon"}
				<PokemonPopup mapId={getCurrentSelectedMapId()} />
			{:else if getCurrentSelectedData().type === "pokestop"}
				<PokestopPopup mapId={getCurrentSelectedMapId()} />
			{:else if getCurrentSelectedData().type === "gym"}
				<GymPopup mapId={getCurrentSelectedMapId()} />
			{:else if getCurrentSelectedData().type === "station"}
				<StationPopup mapId={getCurrentSelectedMapId()} />
			{/if}
		</div>
	{/if}

	<BottomNav page="/" onmapclick={resetMap} />
</div>

<Map />

