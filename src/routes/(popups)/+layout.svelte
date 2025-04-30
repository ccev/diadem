<script lang="ts">
    import { getUserSettings } from '@/lib/userSettings.svelte';
	import { getMap, resetMap } from '@/lib/map/map.svelte';
	import LocateFab from '@/components/ui/fab/LocateFab.svelte';
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
	import SearchFab from '@/components/ui/fab/SearchFab.svelte';
	import { getCurrentSelectedData, getCurrentSelectedMapId } from '@/lib/mapObjects/currentSelectedState.svelte';
	import { slide } from 'svelte/transition';
	import PokemonPopup from '@/components/ui/popups/pokemon/PokemonPopup.svelte';
	import PokestopPopup from '@/components/ui/popups/pokestop/PokestopPopup.svelte';
	import GymPopup from '@/components/ui/popups/gym/GymPopup.svelte';
	import StationPopup from '@/components/ui/popups/station/StationPopup.svelte';
	import { isUiLeft } from '@/lib/deviceCheck';

	let { data, children } = $props();
</script>

<div
	class="fixed z-10 bottom-2 w-full flex flex-col gap-2 pointer-events-none"
	class:items-end={!isUiLeft()}
	class:items-start={isUiLeft()}
>
	{#if getMap()}
		<SearchFab />
		<LocateFab />
	{/if}

	{#if getCurrentSelectedData()}
	<div
		class="w-full max-w-[30rem] z-10"
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