<script lang="ts">
	import SearchGroup from '@/components/ui/search/SearchGroup.svelte';
	import { getKojiGeofences, type KojiFeature } from "@/lib/features/koji.js";
	import type { Feature } from 'geojson';
	import { centroid } from '@turf/turf';
	import { flyTo } from '@/lib/map/utils';
	import NothingFound from '@/components/ui/search/NothingFound.svelte';
	import SearchItem from '@/components/ui/search/SearchItem.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { closeModal } from '@/lib/ui/modal.svelte';
	import { getFeatureJump } from "@/lib/utils/geo";
	import { sortSearchResults } from "@/lib/services/search";

	let {
		searchQuery
	}: {
		searchQuery: string
	} = $props()

	let areas = $derived(sortSearchResults(getKojiGeofences(), searchQuery, a => a.properties.name))
</script>

<SearchGroup title={m.search_area_title()} items={areas}>
	{#if areas.length === 0}
		<NothingFound text={m.search_area_no_areas_found()} />
	{/if}
	{#snippet item(feature: KojiFeature)}
		<SearchItem
			onselect={() => {
				const jumpTo = getFeatureJump(feature)
				flyTo(jumpTo.coords, jumpTo.zoom)
				closeModal("search")
			}}
			value={feature.properties.name.toLowerCase()}
			label={feature.properties.name}
			iconName={feature.properties.lucideIcon || "Globe"}
		/>
	{/snippet}
</SearchGroup>