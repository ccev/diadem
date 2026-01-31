<script lang="ts">
	import Metadata from "@/components/utils/Metadata.svelte";
	import { mPokemon } from "@/lib/services/ingameLocale";
	import * as m from "@/lib/paraglide/messages";
	import { getShareText } from "@/lib/features/shareTexts";
	import { getIconForMap, getIconPokemon, getIconTappable } from "@/lib/services/uicons.svelte.js";
	import { browser } from "$app/environment";
	import type { PageProps } from "./$types";
	import { getDefaultIconSet } from "@/lib/services/userSettings.svelte.js";
	import { getStationPokemon, getStationTitle } from "@/lib/utils/stationUtils";
	import type { StationData } from "@/lib/types/mapObjectData/station";
	import RedirectFlash from "@/components/ui/RedirectFlash.svelte";
	import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { getTappableName } from "@/lib/utils/tappableUtils";

	let { data }: PageProps = $props();

	let title: string = $derived.by(() => {
		if (!data) return "";
		const mapData = data as MapData;

		if (mapData.type === MapObjectType.POKEMON) {
			return mPokemon(mapData);
		} else if (mapData.type === MapObjectType.STATION) {
			let title = "";
			if (mapData.battle_pokemon_id) {
				title = m.pogo_max_battle();
			} else {
				title = m.pogo_station();
			}
			if (mapData.id) title += ": " + getStationTitle(mapData);
			return title;
		} else if (mapData.type === MapObjectType.GYM || mapData.type === MapObjectType.POKESTOP) {
			let title = m[`pogo_${mapData.type}`]().toString();
			if (mapData.name) title += `: ${mapData.name}`;
			return title;
		} else if (mapData.type === MapObjectType.NEST) {
			return m.pokemon_nest({ pokemon: mPokemon(data) })
		} else if (mapData.type === MapObjectType.SPAWNPOINT) {
			return m.pogo_spawnpoint()
		} else if (mapData.type === MapObjectType.ROUTE) {
			// TODO: route share title
		} else if (mapData.type === MapObjectType.TAPPABLE) {
			return getTappableName(mapData) + ` (${m.pogo_tappable()})`
		}
		return "";
	});

	let thumbnail: string = $derived.by(() => {
		if (!data || browser) return "";
		const mapData = data as MapData;

		let icon = "";

		if (mapData.type === MapObjectType.POKEMON && !mapData.id) return "";

		if (mapData.type === MapObjectType.STATION && mapData.battle_pokemon_id) {
			icon = getIconPokemon(getStationPokemon(mapData as StationData), getDefaultIconSet(MapObjectType.POKEMON).id);
		} else if (mapData.type === MapObjectType.TAPPABLE) {
			icon = getIconTappable(mapData)
		} else if (mapData.type === MapObjectType.NEST && mapData.pokemon_id) {
			icon = getIconPokemon(mapData)
		}
		// TODO: route share image

		return icon || mapData.url || getIconForMap(mapData, getDefaultIconSet(mapData.type).id) || "";
	});
</script>

<svelte:head>
	{#if !browser && data}
		<Metadata
			title={title}
			embedTitle={title}
			description={getShareText(data)}
			thumbnail={thumbnail}
		/>
	{/if}
</svelte:head>

<RedirectFlash goal={title} />
