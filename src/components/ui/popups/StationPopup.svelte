<script lang="ts">
	import type { StationData } from '@/lib/types/mapObjectData/station';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconStation, getIconPokestop } from '@/lib/uicons.svelte';
	import ImagePopup from '@/components/ui/popups/ImagePopup.svelte';
	import * as m from "@/lib/paraglide/messages"
	import CommonFortImage from '@/components/ui/popups/CommonFortImage.svelte';
	import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';
	import { getCurrentSelectedData, getMapObjects } from '@/lib/mapObjects/mapObjects.svelte';
	import type { GymData } from '@/lib/types/mapObjectData/gym';

	let { mapId } : { mapId: string } = $props()
	let data: StationData = $derived(getMapObjects()[mapId] as StationData ?? getCurrentSelectedData() as StationData)
</script>

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<div class="w-12 shrink-0">
			<ImagePopup
				alt={m.pogo_station()}
				src={getIconStation(data)}
				class="w-12 h-12"
			/>
		</div>
	{/snippet}

	{#snippet title()}
		<div class="text-lg font-semibold tracking-tight">
			<span>
				{data.name}
			</span>
		</div>
	{/snippet}
</BasePopup>
