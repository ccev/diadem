<script lang="ts">
	import type { FuzzyResult } from "@nozbe/microfuzz";
	import { type AnySearchEntry, SearchableType } from "@/lib/services/search.svelte";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";
	import { getCoverageMap, selectCoverageMapArea } from "@/lib/features/coverageMap.svelte";
	import { getFeatureJump } from "@/lib/utils/geo";
	import { closeSearchModal } from "@/lib/ui/modal.svelte";
	import { point } from "@turf/turf";

	let { results }: { results: FuzzyResult<AnySearchEntry>[] } = $props();
</script>

{#each results as result (result.item.key)}
	{@const entry = result.item}
	{#if entry.type === SearchableType.AREA}
		<SearchItem
			{result}
			onselect={() => {
				selectCoverageMapArea(entry.feature);
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
					getCoverageMap()
				);

				getCoverageMap()?.flyTo({
					center: params.coords,
					zoom: params.zoom
				});

				closeSearchModal();
			}}
		/>
	{:else if entry.type === SearchableType.COORDINATES}
		<SearchItem
			{result}
			onselect={() => {
				getCoverageMap()?.flyTo({
					center: [entry.lon, entry.lat],
					zoom: 16
				});
				closeSearchModal();
			}}
		/>
	{/if}
{/each}
