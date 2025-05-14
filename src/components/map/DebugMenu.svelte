<script lang="ts">
	import Card from '@/components/ui/Card.svelte';
	import { getMap } from '@/lib/map/map.svelte';
	import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte';

	let { rerender }: { rerender: boolean } = $props()
</script>

<Card class="font-mono fixed top-24 right-2 z-10 py-2 px-4 text-xs">
	{#if rerender}
		<div>
			Zoom: {getMap()?.getZoom()?.toFixed(2)}
		</div>
		<div>
			Center: {getMap()?.getCenter()?.lat?.toFixed(6)},{getMap()?.getCenter()?.lng?.toFixed(6)}
		</div>
		<div>
			Map Objects: {Object.keys(getMapObjects()).length}
		</div>
	{/if}
</Card>