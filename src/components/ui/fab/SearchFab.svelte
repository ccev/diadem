<script lang="ts">
	import BaseFab from '@/components/ui/fab/BaseFab.svelte';
	import Search from '@/components/ui/search/Search.svelte';
	import { Search as SearchIcon } from 'lucide-svelte';
	import { closeModal, openModal } from '@/lib/modal.svelte';
	import maplibre from 'maplibre-gl';
	import { closePopup } from '@/lib/mapObjects/mapObjects.svelte';

	let {
		map
	}: {
		map: maplibre.Map | undefined
	} = $props()

	function flyTo(center: number[], zoom: number) {
		closePopup()
		closeModal()
		map?.flyTo({
			center: {lat: center[0], lng: center[1]},
			zoom: zoom,
			bearing: 0,
			pitch: 0,
			speed: 1.5
		})
	}
</script>

{#snippet searchModalSnippet()}
	<Search onjump={flyTo} />
{/snippet}

<BaseFab onclick={() => openModal(searchModalSnippet, "top")}>
	<SearchIcon size="24" />
</BaseFab>