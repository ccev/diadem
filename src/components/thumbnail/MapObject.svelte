<script lang="ts">
	import favicon from "/static/favicon.png?inline";
	import { getClientConfig } from "@/lib/services/config/config.server";
	import * as m from "@/lib/paraglide/messages";
	import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { mPokemon } from "@/lib/services/ingameLocale";
	import { getStationTitle } from "@/lib/utils/stationUtils";
	import type { StationData } from "@/lib/types/mapObjectData/station";
	import type { NestData } from "@/lib/types/mapObjectData/nest";
	import type { TappableData } from "@/lib/types/mapObjectData/tappable";
	import { getTappableName } from "@/lib/utils/tappableUtils";

	let {
		staticmap,
		icon,
		data,
		fullImage
	}: {
		staticmap: string | null;
		icon: string | null;
		data: MapData
		fullImage: boolean
	} = $props();

	const mapName = getClientConfig().general.mapName;

	function getTitle(): string {
		switch (data.type) {
			case MapObjectType.POKEMON:
				return mPokemon(data);
			case MapObjectType.POKESTOP:
				return data.name ?? m.pogo_pokestop();
			case MapObjectType.GYM:
				return data.name ?? m.pogo_gym();
			case MapObjectType.STATION:
				return getStationTitle(data as StationData);
			case MapObjectType.NEST:
				return m.pokemon_nest({ pokemon: mPokemon(data as NestData) });
			case MapObjectType.TAPPABLE:
				return getTappableName(data as TappableData);
			case MapObjectType.SPAWNPOINT:
				return m.pogo_spawnpoint();
			case MapObjectType.ROUTE:
				return data.name ?? m.pogo_route();
			default:
				return data.name ?? data.type;
		}
	}
</script>

<div class="w-full h-full bg-zinc-50 text-zinc-900 flex text-base">
	<div
		class="flex flex-col flex-1 px-6 pl-8 pb-9 pt-8"
		class:pt-6={fullImage}
	>
		<div class="flex flex-col flex-1 justify-center h-full">
			{#if icon}
				<img
					src={icon}
					alt="icon"
					class="w-16 h-16 rounded-full border-zinc-200"
					class:border={fullImage}
					style:object-fit="cover"
				>
			{/if}
			<p class="text-zinc-500 font-bold text-lg uppercase my-0 mt-2">
				{m["pogo_" + data.type]()}
			</p>

			<p
				class="text-3xl my-0 mt-1"
				style:text-overflow="ellipsis"
				style="overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 5;"
			>
				{getTitle().trim()}
			</p>
		</div>

		<div class="flex items-center" style:gap="0.5rem">
			<img src={favicon} alt="logo" class="w-8 h-8 rounded-lg" />
			<span class="text-lg font-bold">
				{mapName}
			</span>
		</div>
	</div>

	{#if staticmap}
		<div class="p-8 pl-0 flex">
			<img
				class="border border-zinc-200 rounded-2xl"
				src={staticmap}
				alt="map"
				style:width="500px"
				style:height="336px"
			/>
		</div>
	{/if}

</div>
