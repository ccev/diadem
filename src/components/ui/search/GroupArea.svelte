<script lang="ts">
	import SearchGroup from '@/components/ui/search/SearchGroup.svelte';
	import { getKojiGeofences } from '@/lib/koji.js';
	import type { Feature } from 'geojson';
	import { centroid } from '@turf/turf';
	import { flyTo } from '@/lib/map/utils';
	import NothingFound from '@/components/ui/search/NothingFound.svelte';
	import SearchItem from '@/components/ui/search/SearchItem.svelte';
	import * as m from '@/lib/paraglide/messages';

	let {
		searchQuery
	}: {
		searchQuery: string
	} = $props()

	let areas = $derived(getKojiGeofences().filter(a => a.properties.name.toLowerCase().includes(searchQuery)))

	// TODO: make it so .startswith is at the top and .filter is at the bottom

	function getPolygonCenter(feature: Feature) {
		return centroid(feature).geometry.coordinates.reverse()
	}
</script>


<SearchGroup title={m.search_area_title()}>
	{#if areas.length === 0}
		<NothingFound text={m.search_area_no_areas_found()} />
	{/if}
	{#each areas as feature (feature.properties.name)}
		<SearchItem
			onselect={() => flyTo(getPolygonCenter(feature), 14)}
			value={feature.properties.name.toLowerCase()}
			label={feature.properties.name}
			iconName={feature.properties.lucideIcon || "Globe"}
		/>
	{/each}
</SearchGroup>