<script lang="ts">
	import { fade, slide } from 'svelte/transition';
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
	import { closeModal, isModalOpen } from '@/lib/modal.svelte';
	import Card from '@/components/ui/Card.svelte';
	import { getUserSettings } from '@/lib/userSettings.svelte';
	import { getConfig } from '@/lib/config';
	import Map from '@/components/map/Map.svelte';
	import maplibre, { type EaseToOptions } from 'maplibre-gl';
	import Search from '@/components/ui/search/Search.svelte';

	let map: maplibre.Map | undefined = $state()

	function resetMap() {
		closePopup()
		closeModal()
		map?.easeTo({
			bearing: 0,
			pitch: 0
		})
	}

	function flyTo(center: number[], zoom: number) {
		closePopup()
		closeModal()
		map?.flyTo({
			center: {lat: center[0], lng: center[1]},
			zoom: zoom,
			bearing: 0,
			pitch: 0,
			speed: 1.5
		})
	}
</script>

{#if isModalOpen()}
	<div
		transition:slide={{duration: 50}}
		class="fixed z-30 top-2 w-full"
	>
		<Search onjump={flyTo} />
	</div>
	<button
		transition:fade={{duration: 50}}
		class="fixed z-20 top-0 h-full w-full backdrop-blur-[1px] backdrop-brightness-95"
		onclick={() => closeModal()}
		aria-label="Close Modal"
	></button>
{/if}

<div
	class="fixed z-10 bottom-2 w-full flex flex-col pointer-events-none"
	class:items-end={!getUserSettings().isLeftHanded}
>
	<div
		class="mx-2 gap-2 mb-2 flex-col flex"
	>
		<SearchFab />
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

