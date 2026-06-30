<script lang="ts">
	import { slide } from "svelte/transition";
	import PokemonPopup from "@/components/ui/popups/pokemon/PokemonPopup.svelte";
	import PokestopPopup from "@/components/ui/popups/pokestop/PokestopPopup.svelte";
	import GymPopup from "@/components/ui/popups/gym/GymPopup.svelte";
	import StationPopup from "@/components/ui/popups/station/StationPopup.svelte";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
	import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import NestPopup from "@/components/ui/popups/nest/NestPopup.svelte";
	import SpawnpointPopup from "@/components/ui/popups/spawnpoint/SpawnpointPopup.svelte";
	import RoutePopup from "@/components/ui/popups/route/RoutePopup.svelte";
	import TappablePopup from "@/components/ui/popups/tappable/TappablePopup.svelte";
	import NewPokestopPopup from "@/components/ui/popups/NewPokestopPopup.svelte";
	import NewPokemonPopup from "@/components/ui/popups/NewPokemonPopup.svelte";
	import PopupBaseDrawer, {
		type MapObjectPopupProps
	} from "@/components/ui/popups2/common/PopupBaseDrawer.svelte";
	import { Coords } from "$lib/utils/coordinates";
	import { watch } from "runed";
	import * as m from "$lib/paraglide/messages";
	import { getPopupPropsPokemon } from "@/components/ui/popups2/pokemon/PokemonPopup.svelte";
	import PopupBaseStatic from "@/components/ui/popups2/common/PopupBaseStatic.svelte";
	import {fly} from "svelte/transition";

	let {
		alwaysExpanded = false
	}: {
		alwaysExpanded?: boolean
	} = $props();

	const popupComponents = {
		[MapObjectType.POKEMON]: NewPokemonPopup,
		[MapObjectType.POKESTOP]: NewPokestopPopup,
		[MapObjectType.GYM]: GymPopup,
		[MapObjectType.STATION]: StationPopup,
		[MapObjectType.NEST]: NestPopup,
		[MapObjectType.SPAWNPOINT]: SpawnpointPopup,
		[MapObjectType.ROUTE]: RoutePopup,
		[MapObjectType.TAPPABLE]: TappablePopup
	};

	const propMap: Partial<Record<MapObjectType, (data: MapData) => MapObjectPopupProps>> = {
		[MapObjectType.POKEMON]: getPopupPropsPokemon
	};

	let data = $derived(getCurrentSelectedData());
	let snapshotData: MapData | undefined = $state(undefined);
	watch(
		() => data,
		() => {
			if (data) {
				snapshotData = $state.snapshot(data);
			}
		}
	);

	let props = $derived(
		snapshotData ? propMap[(snapshotData as MapData).type]?.(snapshotData as MapData) : undefined
	);
</script>

{#if alwaysExpanded}
	{#if data}
		<div
			class="z-10 w-100 h-screen pointer-events-auto border border-border bg-card/60 backdrop-blur-sm"
			transition:fly={{ duration: 90, x: 120 }}
		>
			<PopupBaseStatic
				coords={new Coords(snapshotData?.lat ?? 0, snapshotData?.lon ?? 0)}
				data={snapshotData}
				{props}
				onlyShowNavigationButton={false}
			/>
		</div>
	{/if}
{:else}
	<PopupBaseDrawer
		open={Boolean(data)}
		coords={new Coords(snapshotData?.lat ?? 0, snapshotData?.lon ?? 0)}
		data={snapshotData}
		{props}
	/>
{/if}