<script lang="ts">
	import Card from "@/components/ui/Card.svelte";
	import { getMap } from "@/lib/map/map.svelte";
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import FrameRateControl from "@/lib/map/framerate";
	import { tick } from "svelte";
	import { getLastQueryTimestamps } from "@/lib/mapObjects/updateMapObject";
	import { timestampToLocalTime } from "@/lib/utils/timestampToLocalTime";
	import Countdown from "@/components/utils/Countdown.svelte";

	let rerender: number = $state(0);

	function onMoveEndDebug() {
		rerender += 1;
	}

	$effect(() => {
		const map = getMap();
		if (!map) return;

		if (getUserSettings().showDebugMenu) {
			map.on("moveend", onMoveEndDebug);
		} else {
			map.off("moveend", onMoveEndDebug);
		}

		return () => map.off("moveend", onMoveEndDebug);
	});
</script>

{#if getUserSettings().showDebugMenu}
	<Card class="font-mono fixed top-24 right-2 z-10 py-2 px-4 text-xs">
		{#key rerender}
			<div>
				Zoom: {getMap()?.getZoom()?.toFixed(2)}
			</div>
			<div>
				Center: {getMap()?.getCenter()?.lat?.toFixed(6)},{getMap()?.getCenter()?.lng?.toFixed(6)}
			</div>
		{/key}

		<div>
			Map Objects: {Object.keys(getMapObjects()).length}
		</div>

		<div class="mt-3">updated</div>

		{#each getLastQueryTimestamps().entries() as [type, time]}
			<div>
				<span>{type}:</span>
				<Countdown expireTime={time} />
			</div>
		{/each}
	</Card>
{/if}
