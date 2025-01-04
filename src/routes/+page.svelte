<script lang="ts">
	import { slide } from 'svelte/transition';
	import PokemonPopup from '@/components/ui/popups/PokemonPopup.svelte';
	import PokestopPopup from '@/components/ui/popups/PokestopPopup.svelte';
	import {
		closePopup,
		getCurrentSelectedData,
		getCurrentSelectedObjType
	} from '@/lib/mapObjects/mapObjects.svelte.js';
	import SearchFab from '@/components/ui/fab/SearchFab.svelte';
	import LocateFab from '@/components/ui/fab/LocateFab.svelte';
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
	import { closeModal } from '@/lib/modal.svelte';
	import { getUserSettings } from '@/lib/userSettings.svelte';
	import Map from '@/components/map/Map.svelte';
	import maplibre from 'maplibre-gl';
	import ContextMenu from '@/components/ui/contextmenu/ContextMenu.svelte';
	import { getIsContxtMenuOpen } from '@/components/ui/contextmenu/utils.svelte';

	let map: maplibre.Map | undefined = $state()

	function resetMap() {
		closePopup()
		closeModal()
		map?.easeTo({
			bearing: 0,
			pitch: 0
		})
	}
</script>

{#if getIsContxtMenuOpen()}
	<ContextMenu />
{/if}

<div
	class="fixed z-10 bottom-2 w-full flex flex-col pointer-events-none"
	class:items-end={!getUserSettings().isLeftHanded}
>
	<div
		class="mx-2 gap-2 mb-2 flex-col flex"
	>
		<SearchFab {map} />
		<LocateFab {map} />

	</div>


	{#if getCurrentSelectedObjType()}
		<div
			class="w-full max-w-[30rem] mb-2 z-10"
			style="pointer-events: all"
			transition:slide={{duration: 50}}
		>
			{#if getCurrentSelectedObjType() === "pokemon"}
				<PokemonPopup data={getCurrentSelectedData()} />
			{:else if getCurrentSelectedObjType() === "pokestop"}
				<PokestopPopup data={getCurrentSelectedData()} />
			{/if}
		</div>
	{/if}

	<BottomNav page="/" onmapclick={resetMap} />
</div>

<Map bind:map />

