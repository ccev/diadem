<script lang="ts">
	import SearchGroup from '@/components/ui/search/SearchGroup.svelte';
	import { getKojiGeofences } from '@/lib/features/koji.js';
	import type { Feature } from 'geojson';
	import { centroid } from '@turf/turf';
	import { flyTo } from '@/lib/map/utils';
	import NothingFound from '@/components/ui/search/NothingFound.svelte';
	import SearchItem from '@/components/ui/search/SearchItem.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { closeModal } from '@/lib/ui/modal.svelte';
	import { getFeatureJump } from "@/lib/utils/geo";

	let {
		searchQuery
	}: {
		searchQuery: string
	} = $props()

	let areas = $derived(getKojiGeofences().filter(a => a.properties.name.toLowerCase().includes(searchQuery)))

	// TODO: make it so .startswith is at the top and .filter is at the bottom


</script>


<SearchGroup title={m.search_area_title()}>
	{#if areas.length === 0}
		<NothingFound text={m.search_area_no_areas_found()} />
	{/if}
	{#each areas as feature (feature.properties.name)}
		<SearchItem
			onselect={() => {
				const jumpTo = getFeatureJump(feature)
				flyTo(jumpTo.coords.geojson(), jumpTo.zoom)
				closeModal("search")
			}}
			value={feature.properties.name.toLowerCase()}
			label={feature.properties.name}
			iconName={feature.properties.lucideIcon || "Globe"}
		/>
	{/each}
</SearchGroup>