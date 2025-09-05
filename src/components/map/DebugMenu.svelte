<script lang="ts">
	import Card from '@/components/ui/Card.svelte';
	import { getMap } from '@/lib/map/map.svelte';
	import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte';
	import { getUserSettings } from '@/lib/services/userSettings.svelte';
	import FrameRateControl from '@/lib/map/framerate';
	import { tick } from 'svelte';

	let rerender: boolean = $state(true);
	const frameRateControl = new FrameRateControl({})

	function onMoveEndDebug() {
		rerender = false;
		tick().then(() => rerender = true);
	}

	$effect(() => {
		const map = getMap()
		if (!map) return

		if (getUserSettings().showDebugMenu) {
			map.addControl(frameRateControl);
			map.on('moveend', onMoveEndDebug);
		} else {
			map.removeControl(frameRateControl)
			map.off('moveend', onMoveEndDebug);
		}
	})
</script>

{#if getUserSettings().showDebugMenu}
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
{/if}