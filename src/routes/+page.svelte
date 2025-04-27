<script lang="ts">
	import { slide } from 'svelte/transition';
	import PokemonPopup from '@/components/ui/popups/pokemon/PokemonPopup.svelte';
	import PokestopPopup from '@/components/ui/popups/pokestop/PokestopPopup.svelte';
	import SearchFab from '@/components/ui/fab/SearchFab.svelte';
	import LocateFab from '@/components/ui/fab/LocateFab.svelte';
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
	import { getUserSettings } from '@/lib/userSettings.svelte';
	import Map from '@/components/map/Map.svelte';
	import maplibre from 'maplibre-gl';
	import ContextMenu from '@/components/ui/contextmenu/ContextMenu.svelte';
	import { getIsContxtMenuOpen } from '@/components/ui/contextmenu/utils.svelte';
	import { getConfig } from '@/lib/config';
	import GymPopup from '@/components/ui/popups/gym/GymPopup.svelte';
	import StationPopup from '@/components/ui/popups/station/StationPopup.svelte';
	import { getCurrentSelectedData, getCurrentSelectedMapId } from '@/lib/mapObjects/currentSelectedState.svelte';
	import { closePopup } from '@/lib/mapObjects/interact';

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

<div
	class="fixed z-10 bottom-2 w-full flex flex-col pointer-events-none"
	class:items-end={!getUserSettings().isLeftHanded}
	class:items-start={getUserSettings().isLeftHanded}
>
<BottomNav page="/" />
</div>