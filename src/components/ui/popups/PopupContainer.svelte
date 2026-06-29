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
	import PopupBase, { type MapObjectPopupProps } from "@/components/ui/popups2/common/PopupBase.svelte";
	import { Coords } from "$lib/utils/coordinates";
	import { watch } from "runed";
	import * as m from "$lib/paraglide/messages";
	import { getPopupPropsPokemon } from "@/components/ui/popups2/pokemon/PokemonPopup.svelte";

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

	const propMap: Record<MapObjectType, (data: MapData) => MapObjectPopupProps> = {
		[MapObjectType.POKEMON]: getPopupPropsPokemon,
	}

	let data = $derived(getCurrentSelectedData())
	let snapshotData: MapData | undefined = $state(undefined)
	watch(
		() => data,
		() => {
			if (data) {
				snapshotData = $state.snapshot(data)
			}
		}
	)

	let props = $derived(snapshotData ? propMap[(snapshotData as MapData).type](snapshotData as MapData) : undefined)
</script>

<PopupBase
	open={Boolean(data)}
	coords={new Coords(snapshotData?.lat ?? 0, snapshotData?.lon ?? 0)}
	data={snapshotData}
	{props}
></PopupBase>
