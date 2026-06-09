<script lang="ts">
	import type { FuzzyResult } from "@nozbe/microfuzz";
	import {
		type AnySearchEntry,
		SearchableType,
		type GymSearchEntry,
		type PokestopSearchEntry
	} from "@/lib/services/search.svelte";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";
	import { getFeatureJump } from "@/lib/utils/geo";
	import { closeSearchModal } from "@/lib/ui/modal.svelte";
	import { point } from "@turf/turf";
	import { resize } from "@/lib/services/assets";
	import { getIconGym, getIconPokestop } from "@/lib/services/uicons.svelte";
	import type { AreaSearchEntry, AddressSearchEntry } from "@/lib/services/search.svelte";
	import type maplibre from "maplibre-gl";

	let {
		results,
		map
	}: {
		results: FuzzyResult<AnySearchEntry>[],
		map: maplibre.Map | undefined
	} = $props();

	function wayfarerFlyTo(coords: maplibre.LngLatLike, zoom: number) {
		map?.flyTo({ center: coords, zoom });
	}
</script>

{#each results as result (result.item.key)}
	{@const entry = result.item}
	{#if entry.type === SearchableType.AREA}
		<SearchItem
			{result}
			onselect={() => {
				const areaEntry = entry as AreaSearchEntry;
				const params = getFeatureJump(areaEntry.feature, true, map);
				wayfarerFlyTo(params.coords.maplibre(), params.zoom);
				closeSearchModal();
			}}
		/>
	{:else if entry.type === SearchableType.ADDRESS}
		<SearchItem
			{result}
			onselect={() => {
				const addrEntry = entry as AddressSearchEntry;
				const params = getFeatureJump(
					point(addrEntry.point, undefined, { bbox: addrEntry.bbox }),
					true,
					map
				);
				wayfarerFlyTo(params.coords.maplibre(), params.zoom);
				closeSearchModal();
			}}
		/>
	{:else if entry.type === SearchableType.POKESTOP}
		<SearchItem
			{result}
			fortImage={true}
			imageUrl={resize(getIconPokestop({}), { width: 64 })}
			onselect={() => {
				const psEntry = entry as PokestopSearchEntry;
				wayfarerFlyTo([psEntry.lon, psEntry.lat], 17);
				closeSearchModal();
			}}
		/>
	{:else if entry.type === SearchableType.GYM}
		<SearchItem
			{result}
			fortImage={true}
			imageUrl={resize(getIconGym({ team_id: 0 }), { width: 64 })}
			onselect={() => {
				const gymEntry = entry as GymSearchEntry;
				wayfarerFlyTo([gymEntry.lon, gymEntry.lat], 17);
				closeSearchModal();
			}}
		/>
	{/if}
{/each}
