<script lang="ts">
	import Metadata from "@/components/utils/Metadata.svelte";
	import { mPokemon } from "@/lib/services/ingameLocale";
	import * as m from "@/lib/paraglide/messages";
	import { getShareText } from "@/lib/features/shareTexts";
	import { getIconForMap, getIconPokemon } from "@/lib/services/uicons.svelte.js";
	import { browser } from "$app/environment";
	import type { MapData } from "@/lib/types/mapObjectData/mapObjects";
	import type { PageProps } from "./$types";
	import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
	import { getDefaultIconSet } from "@/lib/services/userSettings.svelte.js";
	import { getStationPokemon, getStationTitle } from "@/lib/utils/stationUtils";
	import type { StationData } from "@/lib/types/mapObjectData/station";
	import RedirectFlash from "@/components/ui/RedirectFlash.svelte";

	let { data }: PageProps = $props();

	let title: string = $derived.by(() => {
		if (!data) return "";
		const mapData = data as MapData;

		if (mapData.type === "pokemon") {
			return mPokemon(mapData as PokemonData);
		} else if (mapData.type === "station") {
			let title = "";
			if (mapData.battle_pokemon_id) {
				title = m.pogo_max_battle();
			} else {
				title = m.pogo_station();
			}
			if (mapData.id) title += ": " + getStationTitle(mapData as StationData);
			return title;
		} else if (mapData.type === "gym" || mapData.type === "pokestop") {
			let title = m[`pogo_${mapData.type}`]();
			if (mapData.name) title += `: ${mapData.name}`;
			return title;
		}
		return "";
	});

	let thumbnail: string = $derived.by(() => {
		if (!data || browser) return "";
		const mapData = data as MapData;

		let icon = "";

		if (mapData.type === "pokemon" && !mapData.id) return "";
		if (mapData.type === "station" && mapData.battle_pokemon_id) {
			icon = getIconPokemon(getStationPokemon(mapData as StationData), getDefaultIconSet("pokemon").id);
		}

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
