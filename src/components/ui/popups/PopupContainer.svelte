<script lang="ts">
	import { slide } from "svelte/transition";
	import PokemonPopup from "@/components/ui/popups/pokemon/PokemonPopup.svelte";
	import PokestopPopup from "@/components/ui/popups/pokestop/PokestopPopup.svelte";
	import GymPopup from "@/components/ui/popups/gym/GymPopup.svelte";
	import StationPopup from "@/components/ui/popups/station/StationPopup.svelte";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import NestPopup from "@/components/ui/popups/nest/NestPopup.svelte";
	import SpawnpointPopup from "@/components/ui/popups/spawnpoint/SpawnpointPopup.svelte";
	import RoutePopup from "@/components/ui/popups/route/RoutePopup.svelte";
	import TappablePopup from "@/components/ui/popups/tappable/TappablePopup.svelte";

	const popupComponents = {
		[MapObjectType.POKEMON]: PokemonPopup,
		[MapObjectType.POKESTOP]: PokestopPopup,
		[MapObjectType.GYM]: GymPopup,
		[MapObjectType.STATION]: StationPopup,
		[MapObjectType.NEST]: NestPopup,
		[MapObjectType.SPAWNPOINT]: SpawnpointPopup,
		[MapObjectType.ROUTE]: RoutePopup,
		[MapObjectType.TAPPABLE]: TappablePopup
	};

	let PopupComponent = $derived(popupComponents[getCurrentSelectedData()?.type])
</script>

{#if PopupComponent}
	<div
		class="w-full max-w-120 z-10"
		style="pointer-events: all"
		transition:slide={{duration: 50}}
	>
		<PopupComponent />
	</div>
{/if}