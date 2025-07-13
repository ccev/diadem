<script lang="ts">
	import { slide } from 'svelte/transition';
	import PokemonPopup from '@/components/ui/popups/pokemon/PokemonPopup.svelte';
	import PokestopPopup from '@/components/ui/popups/pokestop/PokestopPopup.svelte';
	import GymPopup from '@/components/ui/popups/gym/GymPopup.svelte';
	import StationPopup from '@/components/ui/popups/station/StationPopup.svelte';
	import { getCurrentSelectedData, getCurrentSelectedMapId } from '@/lib/mapObjects/currentSelectedState.svelte';
</script>

{#if getCurrentSelectedData()}
	<div
		class="w-full max-w-120 z-10"
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