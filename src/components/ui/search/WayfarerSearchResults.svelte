<script lang="ts">
	import type { FuzzyResult } from "@nozbe/microfuzz";
	import { type AnySearchEntry, SearchableType } from "@/lib/services/search.svelte";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";
	import { getFeatureJump } from "@/lib/utils/geo";
	import { closeSearchModal } from "@/lib/ui/modal.svelte";
	import { point } from "@turf/turf";
	import { resize } from "@/lib/services/assets";
	import { getIconGym, getIconPokestop } from "@/lib/services/uicons.svelte";
	import type maplibre from "maplibre-gl";

	let {
		results,
		map
	}: {
		results: FuzzyResult<AnySearchEntry>[];
		map: maplibre.Map | undefined;
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
				const params = getFeatureJump(entry.feature, true, map);
				wayfarerFlyTo(params.coords.maplibre(), params.zoom);
				closeSearchModal();
			}}
		/>
	{:else if entry.type === SearchableType.ADDRESS}
		<SearchItem
			{result}
			onselect={() => {
				const params = getFeatureJump(
					point(entry.point, undefined, { bbox: entry.bbox }),
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
				wayfarerFlyTo([entry.lon, entry.lat], 17);
				closeSearchModal();
			}}
		/>
	{:else if entry.type === SearchableType.GYM}
		<SearchItem
			{result}
			fortImage={true}
			imageUrl={resize(getIconGym({ team_id: 0 }), { width: 64 })}
			onselect={() => {
				wayfarerFlyTo([entry.lon, entry.lat], 17);
				closeSearchModal();
			}}
		/>
	{/if}
{/each}
