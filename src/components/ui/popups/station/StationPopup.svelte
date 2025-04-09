<script lang="ts">
	import type { StationData } from '@/lib/types/mapObjectData/station';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconStation, getIconPokestop, getIconPokemon } from '@/lib/uicons.svelte.js';
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import * as m from "@/lib/paraglide/messages"
	import FortImage from '@/components/ui/popups/common/FortImage.svelte';
	import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';
	import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte.js';
	import type { GymData } from '@/lib/types/mapObjectData/gym';
	import { timestampToLocalTime } from '@/lib/utils.svelte';
	import { getRaidPokemon } from '@/lib/pogoUtils';
	import { pokemonName } from '@/lib/ingameLocale';
	import { getStationPokemon } from '@/lib/pogoUtils.js';
	import { getCurrentSelectedData } from '@/lib/mapObjects/currentSelectedState.svelte';

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

	{#snippet description()}
		start: {timestampToLocalTime(data.start_time, true)} <br/>
		end: {timestampToLocalTime(data.end_time, true)} <br/>

		<div class="w-8 flex-shrink-0">
			<ImagePopup
				src={getIconPokemon(getStationPokemon(data))}
				alt={pokemonName(getStationPokemon(data))}
				class="w-8"
			/>
		</div>
		<div>
			{pokemonName(getStationPokemon(data))}
		</div>

		<div class="break-all">
			{JSON.stringify(data)}
		</div>

	{/snippet}
</BasePopup>
