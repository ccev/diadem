<script lang="ts">
	import { getMap, resetMap } from '@/lib/map/map.svelte';
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
	import { getUserSettings } from '@/lib/userSettings.svelte';
	import { getConfig } from '@/lib/config';
	import { getCurrentSelectedData, getCurrentSelectedMapId } from '@/lib/mapObjects/currentSelectedState.svelte';
	import PokemonPopup from '@/components/ui/popups/pokemon/PokemonPopup.svelte';
	import StationPopup from '@/components/ui/popups/station/StationPopup.svelte';
	import LocateFab from '@/components/ui/fab/LocateFab.svelte';
	import GymPopup from '@/components/ui/popups/gym/GymPopup.svelte';
	import PokestopPopup from '@/components/ui/popups/pokestop/PokestopPopup.svelte';
	import SearchFab from '@/components/ui/fab/SearchFab.svelte';
	import {slide} from 'svelte/transition';

	let { children } = $props();
</script>

<svelte:head>
	<title>{getConfig().general.mapName}</title>
</svelte:head>

