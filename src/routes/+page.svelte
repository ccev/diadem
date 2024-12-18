<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import PokemonPopup from '@/components/ui/popups/PokemonPopup.svelte';
	import PokestopPopup from '@/components/ui/popups/PokestopPopup.svelte';
	import {
		closePopup,
		getCurrentSelectedData,
		getCurrentSelectedObjType,
		OBJ_TYPE_POKEMON,
		OBJ_TYPE_POKESTOP
	} from '@/lib/mapObjects/mapObjects.svelte.js';
	import SearchFab from '@/components/ui/fab/SearchFab.svelte';
	import LocateFab from '@/components/ui/fab/LocateFab.svelte';
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
	import { closeModal, isModalOpen } from '@/lib/modal.svelte';
	import Card from '@/components/ui/Card.svelte';
	import { getUserSettings } from '@/lib/userSettings.svelte';
	import Map from '@/components/map/Map.svelte';
	import maplibre from 'maplibre-gl';

	let map: maplibre.Map | undefined = $state()

	let inputElement: HTMLInputElement | undefined = $state()
	$effect(() => {
		isModalOpen
		inputElement?.focus()
	})

	function resetMap() {
		closePopup()
		map?.easeTo({
			bearing: 0,
			pitch: 0
		})
	}
</script>

{#if isModalOpen()}
	<div
		transition:slide={{duration: 50}}
		class="absolute z-30 top-2 w-full"
	>
		<Card class="mx-2">
			<input
				bind:this={inputElement}
				class="h-8 w-full ring-1" role="text"
			>
		</Card>
	</div>
	<button
		transition:fade={{duration: 50}}
		class="absolute z-20 top-0 h-full w-full backdrop-blur-[1px] backdrop-brightness-95"
		onclick={() => closeModal()}
		aria-label="Close Modal"
	></button>
{/if}

<div
	class="absolute z-10 bottom-2 w-full flex flex-col pointer-events-none"
	class:items-end={!getUserSettings().isLeftHanded}
>
	<div
		class="mx-2 space-y-1.5 mb-2"
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
			{#if getCurrentSelectedObjType() === OBJ_TYPE_POKEMON}
				<PokemonPopup data={getCurrentSelectedData()} />
			{:else if getCurrentSelectedObjType() === OBJ_TYPE_POKESTOP}
				<PokestopPopup data={getCurrentSelectedData()} />
			{/if}
		</div>
	{/if}

	<BottomNav page="/" onmapclick={resetMap} />
</div>

<Map bind:map />

