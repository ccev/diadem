<script lang="ts">
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { getCurrentSelectedData, getCurrentSelectedMapId } from "@/lib/mapObjects/currentSelectedState.svelte";
	import BasePopup from "@/components/ui/popups/BasePopup.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import type { TappableData } from "@/lib/types/mapObjectData/tappable.d.ts";

	let data: TappableData = $derived(getMapObjects()[getCurrentSelectedMapId()] as TappableData ?? getCurrentSelectedData() as TappableData);
</script>

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<ImagePopup
			alt={""}
			src={""}
			class="w-12 h-12"
		/>
	{/snippet}

	{#snippet title()}
	{/snippet}

	{#snippet description()}
	{/snippet}

	{#snippet content()}
	{/snippet}
</BasePopup>