<script lang="ts">
	import { slide } from 'svelte/transition';
	import PokemonPopup from '@/components/ui/popups/pokemon/PokemonPopup.svelte';
	import PokestopPopup from '@/components/ui/popups/pokestop/PokestopPopup.svelte';
	import GymPopup from '@/components/ui/popups/gym/GymPopup.svelte';
	import StationPopup from '@/components/ui/popups/station/StationPopup.svelte';
	import { getCurrentSelectedData, getCurrentSelectedMapId } from '@/lib/mapObjects/currentSelectedState.svelte';
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import NestPopup from "@/components/ui/popups/nest/NestPopup.svelte";
	import SpawnpointPopup from "@/components/ui/popups/spawnpoint/SpawnpointPopup.svelte";
	import RoutePopup from "@/components/ui/popups/route/RoutePopup.svelte";
	import TappablePopup from "@/components/ui/popups/tappable/TappablePopup.svelte";
</script>

{#if getCurrentSelectedData()}
	<div
		class="w-full max-w-120 z-10"
		style="pointer-events: all"
		transition:slide={{duration: 50}}
	>
		{#if getCurrentSelectedData()?.type === MapObjectType.POKEMON}
			<PokemonPopup />
		{:else if getCurrentSelectedData()?.type === MapObjectType.POKESTOP}
			<PokestopPopup />
		{:else if getCurrentSelectedData()?.type === MapObjectType.GYM}
			<GymPopup />
		{:else if getCurrentSelectedData()?.type === MapObjectType.STATION}
			<StationPopup />
		{:else if getCurrentSelectedData()?.type === MapObjectType.NEST}
			<NestPopup />
		{:else if getCurrentSelectedData()?.type === MapObjectType.SPAWNPOINT}
			<SpawnpointPopup />
		{:else if getCurrentSelectedData()?.type === MapObjectType.ROUTE}
			<RoutePopup />
		{:else if getCurrentSelectedData()?.type === MapObjectType.TAPPABLE}
			<TappablePopup />
		{/if}
	<!--	TODO: S2 Cell popup -->
	</div>
{/if}