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
	import { getConfig } from '@/lib/config';
	import GymPopup from '@/components/ui/popups/gym/GymPopup.svelte';
	import StationPopup from '@/components/ui/popups/station/StationPopup.svelte';
	import { getCurrentSelectedData, getCurrentSelectedMapId } from '@/lib/mapObjects/currentSelectedState.svelte';
	import { resetMap, getMap } from '@/lib/map/map.svelte';
	import { getCurrentWeather } from '@/lib/mapObjects/weather.svelte';
	import { ingame } from '@/lib/ingameLocale';
	import Card from '@/components/ui/Card.svelte';
	import { currentTimestamp } from '@/lib/utils.svelte';
	import { WEATHER_OUTDATED_SECONDS } from '@/lib/constants';
	import Button from '@/components/ui/Button.svelte';
	import WeatherOverview from '@/components/map/WeatherOverview.svelte';

	import { getIsContextMenuOpen } from '@/lib/map/contextmenu.svelte';
	</script>

<svelte:head>
	<title>{getConfig().general.mapName}</title>
</svelte:head>

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
			<SearchFab />
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

