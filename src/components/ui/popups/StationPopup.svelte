<script lang="ts">
	import type { StationData } from '@/lib/types/mapObjectData/station';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconStation, getIconPokestop } from '@/lib/uicons.svelte';
	import ImagePopup from '@/components/ui/popups/ImagePopup.svelte';
	import * as m from "@/lib/paraglide/messages"
	import ImageFort from '@/components/ui/popups/ImageFort.svelte';


	let {data} : {data: StationData} = $props()

</script>

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<ImagePopup
			alt={m.pogo_station()}
			src={getIconStation(data)}
			class="w-12 h-12"
			w="12"
		/>
	{/snippet}

	{#snippet title()}
		<div class="text-lg font-semibold tracking-tight">
			<span>
				{data.name}
			</span>
		</div>
	{/snippet}
</BasePopup>
